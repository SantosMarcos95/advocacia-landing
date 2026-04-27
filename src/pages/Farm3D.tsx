import { useState, useEffect } from 'react'
import {
  Plus, Trash2, Edit2, Check, X, Settings, Layers, ArrowLeft,
  LayoutDashboard, Package, Wrench, AlertTriangle, ShoppingCart,
  Target, Clock, XCircle, Thermometer, ChevronRight,
  DollarSign, Percent, TrendingUp, LogOut, Loader, Archive, Minus,
} from 'lucide-react'
import {
  collection, doc, setDoc, deleteDoc, getDocs, getDoc,
} from 'firebase/firestore'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { db, auth, googleProvider, ADMIN_EMAIL } from '../lib/firebase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Filament {
  id: string; name: string; color: string; pricePerKg: number
  stockG: number; material: string; nozzleTempC: number; bedTempC: number
}
interface CostConfig {
  electricityKwh: number; printerWatts: number
  depreciationPerHour: number; printerTotalH: number
  reinvestPct: number; paymentPct: number; reservePct: number
}
interface Product {
  id: string; name: string; quantity: number; filamentId: string
  weightPerPieceG: number; infillPct: number; purgeWasteG: number
  printTimeH: number; realSellingPrice: number; saleDate: string
  stockItemId?: string
}
interface MaintenanceTask {
  id: string; name: string; description: string
  intervalH: number; lastDoneAtH: number
}
interface FailedPrint {
  id: string; date: string; description: string; filamentId: string
  wastedG: number; wastedTimeH: number
  reason: 'descolou'|'spaghetti'|'entupimento'|'falta_energia'|'arquivo'|'outro'
  notes: string
}
interface Order {
  id: string; clientName: string; clientContact: string
  productName: string; quantity: number; unitPrice: number
  status: 'aguardando'|'imprimindo'|'pronto'|'entregue'|'cancelado'
  paid: boolean; orderDate: string; dueDate: string; notes: string
}
interface MonthlyGoal { month: string; target: number }
interface StockItem {
  id: string; name: string; filamentId: string
  weightPerPieceG: number; infillPct: number; purgeWasteG: number
  printTimeH: number; stockQty: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9)
const today = () => new Date().toISOString().slice(0, 10)
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtN = (v: number, d = 0) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })
const toNum = (s: string) => parseFloat(s.replace(',', '.')) || 0
const currentMonth = () => new Date().toISOString().slice(0, 7)
const monthLabel = (m: string) => { const [y, mo] = m.split('-'); return `${['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][+mo-1]}/${y}` }

const DEFAULT_CONFIG: CostConfig = {
  electricityKwh: 0.38, printerWatts: 500, depreciationPerHour: 1.0,
  printerTotalH: 0, reinvestPct: 40, paymentPct: 40, reservePct: 20,
}

const MATERIALS: Record<string, { nozzleTempC: number; bedTempC: number }> = {
  PLA: { nozzleTempC: 210, bedTempC: 60 }, 'PLA+': { nozzleTempC: 215, bedTempC: 60 },
  'PLA Silk': { nozzleTempC: 220, bedTempC: 60 }, PETG: { nozzleTempC: 235, bedTempC: 80 },
  ABS: { nozzleTempC: 240, bedTempC: 100 }, ASA: { nozzleTempC: 245, bedTempC: 100 },
  TPU: { nozzleTempC: 225, bedTempC: 30 }, Nylon: { nozzleTempC: 250, bedTempC: 80 },
}

const FAIL_REASONS: Record<string, string> = {
  descolou: 'Descolou da mesa', spaghetti: 'Spaghetti / fio solto',
  entupimento: 'Entupimento do bico', falta_energia: 'Falta de energia',
  arquivo: 'Erro no arquivo/fatiamento', outro: 'Outro',
}

const DEFAULT_TASKS: Omit<MaintenanceTask, 'id'>[] = [
  { name: 'Limpeza do AMS', description: 'Limpar hub e sensores do sistema de troca automática', intervalH: 50, lastDoneAtH: 0 },
  { name: 'Calibração da Mesa', description: 'Nivelamento automático e ajuste do z-offset', intervalH: 100, lastDoneAtH: 0 },
  { name: 'Lubrificação Eixo Z', description: 'Lubrificar fuso trapezoidal e trilhos do eixo Z', intervalH: 100, lastDoneAtH: 0 },
  { name: 'Tensão das Correias', description: 'Verificar e ajustar tensão das correias X e Y', intervalH: 150, lastDoneAtH: 0 },
  { name: 'Calibração de Fluxo', description: 'Calibrar o flow rate por tipo de filamento', intervalH: 150, lastDoneAtH: 0 },
  { name: 'Lubrificação X/Y', description: 'Lubrificar trilhos e barras dos eixos X e Y', intervalH: 200, lastDoneAtH: 0 },
  { name: 'Troca de Bico', description: 'Substituir nozzle — AMS desgasta mais rápido', intervalH: 300, lastDoneAtH: 0 },
  { name: 'Troca do Tubo PTFE', description: 'Substituir tubos PTFE do extrusor e do AMS', intervalH: 500, lastDoneAtH: 0 },
]

const ORDER_STATUS_FLOW: Order['status'][] = ['aguardando','imprimindo','pronto','entregue']
const ORDER_STATUS_LABEL: Record<Order['status'], string> = {
  aguardando:'Aguardando', imprimindo:'Imprimindo', pronto:'Pronto', entregue:'Entregue', cancelado:'Cancelado',
}
const ORDER_STATUS_COLOR: Record<Order['status'], string> = {
  aguardando:'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  imprimindo:'text-blue-400 bg-blue-400/10 border-blue-400/30',
  pronto:'text-purple-400 bg-purple-400/10 border-purple-400/30',
  entregue:'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  cancelado:'text-white/30 bg-white/5 border-white/10',
}

// Firestore collection names
const COL = {
  filaments: 'farm3d_filaments', products: 'farm3d_products',
  tasks: 'farm3d_tasks', fails: 'farm3d_fails',
  orders: 'farm3d_orders', goals: 'farm3d_goals',
  stock: 'farm3d_stock',
}
const CFG_DOC = () => doc(db, 'farm3d_config', 'main')

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcProduct(p: Product, filaments: Filament[], cfg: CostConfig) {
  const fil = filaments.find((f) => f.id === p.filamentId)
  const pricePerKg = fil?.pricePerKg ?? 0
  const elec = (cfg.printerWatts / 1000) * cfg.electricityKwh
  const machineH = elec + cfg.depreciationPerHour
  const costPerPiece = (pricePerKg / 1000) * p.weightPerPieceG * 1.1 + p.printTimeH * machineH
  const purgeCost = (pricePerKg / 1000) * (p.purgeWasteG || 0)
  const totalCost = costPerPiece * p.quantity + purgeCost
  const suggestedPrice = totalCost * 3
  const netProfit = p.realSellingPrice - totalCost
  const rPct = (cfg.reinvestPct ?? 40) / 100
  const payPct = (cfg.paymentPct ?? 40) / 100
  const resPct = (cfg.reservePct ?? 20) / 100
  return { totalCost, suggestedPrice, netProfit, reinvest: netProfit * rPct, payment: netProfit * payPct, reserve: netProfit * resPct }
}

function calcFailedCost(f: FailedPrint, filaments: Filament[], cfg: CostConfig) {
  const fil = filaments.find((x) => x.id === f.filamentId)
  const elec = (cfg.printerWatts / 1000) * cfg.electricityKwh
  return (fil ? (fil.pricePerKg / 1000) * f.wastedG : 0) + f.wastedTimeH * (elec + cfg.depreciationPerHour)
}

function taskStatus(task: MaintenanceTask, totalH: number) {
  const used = totalH - task.lastDoneAtH
  const remaining = task.intervalH - used
  const pct = Math.min((used / task.intervalH) * 100, 100)
  if (remaining <= 0) return { label: 'Vencida', color: 'text-red-400', bg: 'bg-red-400', pct: 100, overdue: true }
  if (remaining <= task.intervalH * 0.15) return { label: `${fmtN(remaining)}h restantes`, color: 'text-yellow-400', bg: 'bg-yellow-400', pct, overdue: false }
  return { label: `${fmtN(remaining)}h restantes`, color: 'text-emerald-400', bg: 'bg-emerald-400', pct, overdue: false }
}

function getMonthRevenue(month: string, products: Product[]) {
  return products.filter((p) => (p.saleDate || '').startsWith(month)).reduce((s, p) => s + p.realSellingPrice, 0)
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputCls = 'w-full bg-dark border border-gold/20 rounded px-3 py-2 text-white text-sm focus:border-gold/50 outline-none transition-colors'
const selectCls = 'w-full bg-dark border border-gold/20 rounded px-3 py-2 text-white text-sm focus:border-gold/50 outline-none transition-colors'

type Tab = 'painel'|'pedidos'|'manutencao'|'filamentos'|'vendas'|'estoque'|'config'

function Card({ label, value, sub, color='text-white' }: { label:string; value:string; sub?:string; color?:string }) {
  return (
    <div className="bg-dark-200 border border-gold/10 rounded-lg p-4">
      <p className="text-white/40 text-xs uppercase tracking-wider mb-2">{label}</p>
      <p className={`font-mono font-bold text-xl ${color}`}>{value}</p>
      {sub && <p className="text-white/30 text-xs mt-1">{sub}</p>}
    </div>
  )
}

// ─── Empty forms ──────────────────────────────────────────────────────────────
const EMPTY_FIL = { name:'', color:'#f97316', pricePerKg:'', stockG:'', material:'PLA', nozzleTempC:'210', bedTempC:'60' }
const EMPTY_PROD = { name:'', quantity:'1', filamentId:'', weightPerPieceG:'', infillPct:'15', purgeWasteG:'0', printTimeH:'', realSellingPrice:'', saleDate:today(), stockItemId:'' }
const EMPTY_STOCK = { name:'', filamentId:'', weightPerPieceG:'', infillPct:'15', purgeWasteG:'0', printTimeH:'', stockQty:'0' }
const EMPTY_FAIL = { date:today(), description:'', filamentId:'', wastedG:'', wastedTimeH:'', reason:'outro', notes:'' }
const EMPTY_ORDER = { clientName:'', clientContact:'', productName:'', quantity:'1', unitPrice:'', orderDate:today(), dueDate:'', notes:'' }

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Farm3D() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [tab, setTab] = useState<Tab>('painel')

  // Data
  const [config, setConfig] = useState<CostConfig>(DEFAULT_CONFIG)
  const [cfgForm, setCfgForm] = useState<CostConfig>(DEFAULT_CONFIG)
  const [cfgSaved, setCfgSaved] = useState(false)
  const [filaments, setFilaments] = useState<Filament[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [tasks, setTasks] = useState<MaintenanceTask[]>([])
  const [fails, setFails] = useState<FailedPrint[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [goals, setGoals] = useState<MonthlyGoal[]>([])
  const [stockItems, setStockItems] = useState<StockItem[]>([])

  // Forms
  const [showFilForm, setShowFilForm] = useState(false)
  const [editFilId, setEditFilId] = useState<string|null>(null)
  const [filForm, setFilForm] = useState(EMPTY_FIL)
  const [showProdForm, setShowProdForm] = useState(false)
  const [editProdId, setEditProdId] = useState<string|null>(null)
  const [prodForm, setProdForm] = useState(EMPTY_PROD)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskForm, setTaskForm] = useState({ name:'', description:'', intervalH:'' })
  const [showFailForm, setShowFailForm] = useState(false)
  const [failForm, setFailForm] = useState(EMPTY_FAIL)
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [editOrderId, setEditOrderId] = useState<string|null>(null)
  const [orderForm, setOrderForm] = useState(EMPTY_ORDER)
  const [goalInput, setGoalInput] = useState('')
  const [showStockForm, setShowStockForm] = useState(false)
  const [editStockId, setEditStockId] = useState<string|null>(null)
  const [stockForm, setStockForm] = useState(EMPTY_STOCK)

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setAuthLoading(false)
    })
  }, [])

  useEffect(() => {
    if (user) loadData()
  }, [user])

  async function login() {
    try { await signInWithPopup(auth, googleProvider) } catch {}
  }

  // ── Firestore load ────────────────────────────────────────────────────────
  async function loadData() {
    setDataLoading(true)
    try {
      const [filSnap, prodSnap, taskSnap, failSnap, orderSnap, cfgSnap, goalSnap, stockSnap] = await Promise.all([
        getDocs(collection(db, COL.filaments)),
        getDocs(collection(db, COL.products)),
        getDocs(collection(db, COL.tasks)),
        getDocs(collection(db, COL.fails)),
        getDocs(collection(db, COL.orders)),
        getDoc(CFG_DOC()),
        getDocs(collection(db, COL.goals)),
        getDocs(collection(db, COL.stock)),
      ])
      setFilaments(filSnap.docs.map((d) => d.data() as Filament))
      setProducts(prodSnap.docs.map((d) => d.data() as Product))
      setFails(failSnap.docs.map((d) => d.data() as FailedPrint).sort((a,b) => b.date.localeCompare(a.date)))
      setOrders(orderSnap.docs.map((d) => d.data() as Order).sort((a,b) => b.orderDate.localeCompare(a.orderDate)))
      setGoals(goalSnap.docs.map((d) => d.data() as MonthlyGoal))
      setStockItems(stockSnap.docs.map((d) => d.data() as StockItem))

      if (taskSnap.empty) {
        const defaultTasks = DEFAULT_TASKS.map((t) => ({ ...t, id: uid() }))
        setTasks(defaultTasks)
        await Promise.all(defaultTasks.map((t) => setDoc(doc(db, COL.tasks, t.id), t)))
      } else {
        setTasks(taskSnap.docs.map((d) => d.data() as MaintenanceTask))
      }

      if (cfgSnap.exists()) {
        const saved = { ...DEFAULT_CONFIG, ...cfgSnap.data() } as CostConfig
        setConfig(saved)
        setCfgForm(saved)
      }
    } catch (e) { console.error(e) }
    setDataLoading(false)
  }

  // ── Config ────────────────────────────────────────────────────────────────
  async function saveConfig() {
    const totalPct = cfgForm.reinvestPct + cfgForm.paymentPct + cfgForm.reservePct
    if (Math.abs(totalPct - 100) > 0.01) return
    setConfig({ ...cfgForm })
    await setDoc(CFG_DOC(), cfgForm)
    setCfgSaved(true)
    setTimeout(() => setCfgSaved(false), 2000)
  }

  // ── Filaments ─────────────────────────────────────────────────────────────
  function openAddFil() { setFilForm(EMPTY_FIL); setEditFilId(null); setShowFilForm(true) }
  function openEditFil(f: Filament) {
    setFilForm({ name:f.name, color:f.color, pricePerKg:String(f.pricePerKg), stockG:String(f.stockG||''), material:f.material||'PLA', nozzleTempC:String(f.nozzleTempC||210), bedTempC:String(f.bedTempC||60) })
    setEditFilId(f.id); setShowFilForm(true)
  }
  async function saveFil() {
    if (!filForm.name.trim() || toNum(filForm.pricePerKg) <= 0) return
    const fil: Filament = { id: editFilId || uid(), name:filForm.name.trim(), color:filForm.color, pricePerKg:toNum(filForm.pricePerKg), stockG:toNum(filForm.stockG), material:filForm.material, nozzleTempC:toNum(filForm.nozzleTempC), bedTempC:toNum(filForm.bedTempC) }
    setFilaments((p) => editFilId ? p.map((f) => f.id===editFilId ? fil : f) : [...p, fil])
    await setDoc(doc(db, COL.filaments, fil.id), fil)
    setShowFilForm(false); setEditFilId(null)
  }
  async function deleteFil(id: string) {
    setFilaments((p) => p.filter((f) => f.id !== id))
    await deleteDoc(doc(db, COL.filaments, id))
  }

  // ── Products ──────────────────────────────────────────────────────────────
  function openAddProd() { setProdForm({ ...EMPTY_PROD, saleDate:today() }); setEditProdId(null); setShowProdForm(true) }
  function openEditProd(p: Product) {
    setProdForm({ name:p.name, quantity:String(p.quantity), filamentId:p.filamentId, weightPerPieceG:String(p.weightPerPieceG), infillPct:String(p.infillPct||15), purgeWasteG:String(p.purgeWasteG||0), printTimeH:String(p.printTimeH), realSellingPrice:String(p.realSellingPrice), saleDate:p.saleDate||today(), stockItemId:p.stockItemId||'' })
    setEditProdId(p.id); setShowProdForm(true)
  }
  async function saveProd() {
    if (!prodForm.name.trim() || !prodForm.filamentId || toNum(prodForm.quantity) <= 0) return
    const prod: Product = { id:editProdId||uid(), name:prodForm.name.trim(), quantity:toNum(prodForm.quantity), filamentId:prodForm.filamentId, weightPerPieceG:toNum(prodForm.weightPerPieceG), infillPct:toNum(prodForm.infillPct), purgeWasteG:toNum(prodForm.purgeWasteG), printTimeH:toNum(prodForm.printTimeH), realSellingPrice:toNum(prodForm.realSellingPrice), saleDate:prodForm.saleDate, stockItemId:prodForm.stockItemId||undefined }
    setProducts((p) => editProdId ? p.map((x) => x.id===editProdId ? prod : x) : [...p, prod])
    await setDoc(doc(db, COL.products, prod.id), prod)
    // Ao registrar uma nova venda, cria pedido automaticamente
    if (!editProdId) {
      const qty = toNum(prodForm.quantity)
      const o: Order = { id:uid(), clientName:'Venda direta', clientContact:'', productName:prod.name, quantity:qty, unitPrice: qty > 0 ? prod.realSellingPrice / qty : prod.realSellingPrice, status:'entregue', paid:true, orderDate:prod.saleDate, dueDate:prod.saleDate, notes:'' }
      setOrders((p) => [o, ...p])
      await setDoc(doc(db, COL.orders, o.id), o)
      // Decrementa estoque se veio do catálogo
      if (prodForm.stockItemId) {
        const si = stockItems.find((s) => s.id === prodForm.stockItemId)
        if (si) {
          const updated = { ...si, stockQty: Math.max(0, si.stockQty - qty) }
          setStockItems((p) => p.map((s) => s.id === si.id ? updated : s))
          await setDoc(doc(db, COL.stock, si.id), updated)
        }
      }
    }
    setShowProdForm(false); setEditProdId(null)
  }
  async function deleteProd(id: string) {
    setProducts((p) => p.filter((x) => x.id !== id))
    await deleteDoc(doc(db, COL.products, id))
  }

  // ── Tasks ─────────────────────────────────────────────────────────────────
  async function markDone(id: string) {
    const updated = tasks.map((t) => t.id===id ? { ...t, lastDoneAtH:config.printerTotalH } : t)
    setTasks(updated)
    const t = updated.find((x) => x.id === id)!
    await setDoc(doc(db, COL.tasks, id), t)
  }
  async function addTask() {
    if (!taskForm.name.trim() || toNum(taskForm.intervalH) <= 0) return
    const t: MaintenanceTask = { id:uid(), name:taskForm.name.trim(), description:taskForm.description, intervalH:toNum(taskForm.intervalH), lastDoneAtH:config.printerTotalH }
    setTasks((p) => [...p, t])
    await setDoc(doc(db, COL.tasks, t.id), t)
    setTaskForm({ name:'', description:'', intervalH:'' }); setShowTaskForm(false)
  }
  async function deleteTask(id: string) {
    setTasks((p) => p.filter((x) => x.id !== id))
    await deleteDoc(doc(db, COL.tasks, id))
  }

  // ── Failed prints ─────────────────────────────────────────────────────────
  async function saveFail() {
    if (!failForm.description.trim()) return
    const f: FailedPrint = { id:uid(), date:failForm.date, description:failForm.description, filamentId:failForm.filamentId, wastedG:toNum(failForm.wastedG), wastedTimeH:toNum(failForm.wastedTimeH), reason:failForm.reason as FailedPrint['reason'], notes:failForm.notes }
    setFails((p) => [f, ...p])
    await setDoc(doc(db, COL.fails, f.id), f)
    setFailForm(EMPTY_FAIL); setShowFailForm(false)
  }
  async function deleteFail(id: string) {
    setFails((p) => p.filter((x) => x.id !== id))
    await deleteDoc(doc(db, COL.fails, id))
  }

  // ── Orders ────────────────────────────────────────────────────────────────
  function openAddOrder() { setOrderForm(EMPTY_ORDER); setEditOrderId(null); setShowOrderForm(true) }
  function openEditOrder(o: Order) {
    setOrderForm({ clientName:o.clientName, clientContact:o.clientContact, productName:o.productName, quantity:String(o.quantity), unitPrice:String(o.unitPrice), orderDate:o.orderDate, dueDate:o.dueDate, notes:o.notes })
    setEditOrderId(o.id); setShowOrderForm(true)
  }
  async function saveOrder() {
    if (!orderForm.clientName.trim() || !orderForm.productName.trim()) return
    if (editOrderId) {
      const existing = orders.find((o) => o.id === editOrderId)!
      const updated = { ...existing, clientName:orderForm.clientName.trim(), clientContact:orderForm.clientContact, productName:orderForm.productName.trim(), quantity:toNum(orderForm.quantity), unitPrice:toNum(orderForm.unitPrice), orderDate:orderForm.orderDate, dueDate:orderForm.dueDate, notes:orderForm.notes }
      setOrders((p) => p.map((o) => o.id===editOrderId ? updated : o))
      await setDoc(doc(db, COL.orders, editOrderId), updated)
    } else {
      const o: Order = { id:uid(), clientName:orderForm.clientName.trim(), clientContact:orderForm.clientContact, productName:orderForm.productName.trim(), quantity:toNum(orderForm.quantity), unitPrice:toNum(orderForm.unitPrice), status:'aguardando', paid:false, orderDate:orderForm.orderDate, dueDate:orderForm.dueDate, notes:orderForm.notes }
      setOrders((p) => [o, ...p])
      await setDoc(doc(db, COL.orders, o.id), o)
    }
    setShowOrderForm(false); setEditOrderId(null)
  }
  async function updateOrder(id: string, patch: Partial<Order>) {
    const updated = orders.map((o) => o.id===id ? { ...o, ...patch } : o)
    setOrders(updated)
    const o = updated.find((x) => x.id===id)!
    await setDoc(doc(db, COL.orders, id), o)
  }
  async function deleteOrder(id: string) {
    setOrders((p) => p.filter((x) => x.id !== id))
    await deleteDoc(doc(db, COL.orders, id))
  }

  // ── Stock ─────────────────────────────────────────────────────────────────
  function openAddStock() { setStockForm(EMPTY_STOCK); setEditStockId(null); setShowStockForm(true) }
  function openEditStock(s: StockItem) {
    setStockForm({ name:s.name, filamentId:s.filamentId, weightPerPieceG:String(s.weightPerPieceG), infillPct:String(s.infillPct||15), purgeWasteG:String(s.purgeWasteG||0), printTimeH:String(s.printTimeH), stockQty:String(s.stockQty||0) })
    setEditStockId(s.id); setShowStockForm(true)
  }
  async function saveStock() {
    if (!stockForm.name.trim() || !stockForm.filamentId) return
    const s: StockItem = { id:editStockId||uid(), name:stockForm.name.trim(), filamentId:stockForm.filamentId, weightPerPieceG:toNum(stockForm.weightPerPieceG), infillPct:toNum(stockForm.infillPct), purgeWasteG:toNum(stockForm.purgeWasteG), printTimeH:toNum(stockForm.printTimeH), stockQty:toNum(stockForm.stockQty) }
    setStockItems((p) => editStockId ? p.map((x) => x.id===editStockId ? s : x) : [...p, s])
    await setDoc(doc(db, COL.stock, s.id), s)
    setShowStockForm(false); setEditStockId(null)
  }
  async function deleteStock(id: string) {
    setStockItems((p) => p.filter((x) => x.id !== id))
    await deleteDoc(doc(db, COL.stock, id))
  }
  async function addStockQty(id: string, delta: number) {
    const si = stockItems.find((s) => s.id === id)
    if (!si) return
    const updated = { ...si, stockQty: Math.max(0, si.stockQty + delta) }
    setStockItems((p) => p.map((s) => s.id === id ? updated : s))
    await setDoc(doc(db, COL.stock, id), updated)
  }

  // ── Goals ─────────────────────────────────────────────────────────────────
  async function saveGoal() {
    const target = toNum(goalInput)
    if (target <= 0) return
    const month = currentMonth()
    const g: MonthlyGoal = { month, target }
    setGoals((p) => { const filtered = p.filter((x) => x.month !== month); return [...filtered, g] })
    await setDoc(doc(db, COL.goals, month), g)
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const overdueTasks = tasks.filter((t) => taskStatus(t, config.printerTotalH).overdue)
  const dueSoonTasks = tasks.filter((t) => { const s = taskStatus(t, config.printerTotalH); return !s.overdue && (config.printerTotalH - t.lastDoneAtH) / t.intervalH > 0.85 })
  const thisMonth = currentMonth()
  const thisMonthGoal = goals.find((g) => g.month === thisMonth)
  const monthRevenue = getMonthRevenue(thisMonth, products)
  const goalPct = thisMonthGoal ? Math.min((monthRevenue / thisMonthGoal.target) * 100, 100) : 0
  const totals = products.reduce((acc, p) => {
    const c = calcProduct(p, filaments, config)
    return { cost:acc.cost+c.totalCost, profit:acc.profit+c.netProfit, reinvest:acc.reinvest+c.reinvest, payment:acc.payment+c.payment, reserve:acc.reserve+c.reserve, revenue:acc.revenue+p.realSellingPrice, pieces:acc.pieces+p.quantity }
  }, { cost:0, profit:0, reinvest:0, payment:0, reserve:0, revenue:0, pieces:0 })
  const thisMonthFails = fails.filter((f) => f.date.startsWith(thisMonth))
  const failsCost = thisMonthFails.reduce((s, f) => s + calcFailedCost(f, filaments, config), 0)
  const activeOrders = orders.filter((o) => o.status!=='entregue' && o.status!=='cancelado')
  const filamentConsumption = filaments.map((f) => {
    const consumedG = products.filter((p) => p.filamentId===f.id).reduce((s, p) => s+p.weightPerPieceG*p.quantity, 0)
    return { ...f, consumedG, remainingG:(f.stockG||0)-consumedG }
  })
  const productStats = products.map((p) => ({ ...p, ...calcProduct(p, filaments, config) })).sort((a,b) => b.netProfit-a.netProfit)
  const previewCalc = (() => {
    if (!prodForm.filamentId || !prodForm.weightPerPieceG || !prodForm.printTimeH || !prodForm.quantity) return null
    return calcProduct({ id:'', name:'', quantity:toNum(prodForm.quantity), filamentId:prodForm.filamentId, weightPerPieceG:toNum(prodForm.weightPerPieceG), infillPct:toNum(prodForm.infillPct), purgeWasteG:toNum(prodForm.purgeWasteG), printTimeH:toNum(prodForm.printTimeH), realSellingPrice:toNum(prodForm.realSellingPrice), saleDate:prodForm.saleDate }, filaments, config)
  })()

  // All months with data (goals or sales), sorted desc
  const allMonths = [...new Set([
    ...goals.map((g) => g.month),
    ...products.map((p) => (p.saleDate||'').slice(0,7)).filter(Boolean),
  ])].sort().reverse()

  const totalPct = cfgForm.reinvestPct + cfgForm.paymentPct + cfgForm.reservePct
  const pctValid = Math.abs(totalPct - 100) < 0.01

  // ── Auth screens ──────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <Loader size={24} className="text-gold animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-dark flex flex-col items-center justify-center gap-6">
        <div className="w-12 h-12 rounded border border-gold/40 bg-gold/10 flex items-center justify-center">
          <span className="text-gold font-bold font-mono">3D</span>
        </div>
        <div className="text-center">
          <h1 className="text-white font-serif text-2xl font-semibold">Farm 3D</h1>
          <p className="text-white/40 text-sm mt-1">Gestão de Produção</p>
        </div>
        <button onClick={login} className="flex items-center gap-3 px-6 py-3 border border-gold text-gold hover:bg-gold hover:text-dark transition-all rounded font-medium">
          <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Entrar com Google
        </button>
        <a href="/" className="text-white/30 hover:text-white/60 text-sm transition-colors flex items-center gap-1.5"><ArrowLeft size={12} /> Voltar ao site</a>
      </div>
    )
  }

  if (user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen bg-dark flex flex-col items-center justify-center gap-4">
        <p className="text-red-400">Acesso não autorizado.</p>
        <button onClick={() => signOut(auth)} className="text-white/40 hover:text-white text-sm transition-colors">Sair</button>
      </div>
    )
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center gap-3">
        <Loader size={20} className="text-gold animate-spin" />
        <span className="text-white/40 text-sm">Carregando dados...</span>
      </div>
    )
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-dark text-white font-sans">

      <header className="bg-dark-200 border-b border-gold/20 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <a href="/" className="text-white/40 hover:text-gold transition-colors text-sm flex items-center gap-1.5"><ArrowLeft size={14} /> Voltar ao site</a>
          <div className="h-4 w-px bg-gold/20" />
          <div className="flex items-center gap-2.5 flex-1">
            <div className="w-8 h-8 rounded border border-gold/40 bg-gold/10 flex items-center justify-center">
              <span className="text-gold text-xs font-bold font-mono">3D</span>
            </div>
            <h1 className="text-white font-serif font-semibold">Farm 3D</h1>
            {overdueTasks.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-red-400 bg-red-400/10 border border-red-400/30 px-2 py-0.5 rounded-full">
                <AlertTriangle size={10} /> {overdueTasks.length} manutenção vencida
              </span>
            )}
          </div>
          <button onClick={() => signOut(auth)} className="text-white/30 hover:text-white/60 transition-colors flex items-center gap-1.5 text-xs">
            <LogOut size={13} /> Sair
          </button>
        </div>
      </header>

      <div className="bg-dark-200/60 border-b border-gold/10">
        <div className="max-w-7xl mx-auto px-6 flex overflow-x-auto">
          {([
            ['painel', LayoutDashboard, 'Painel'],
            ['pedidos', ShoppingCart, 'Pedidos'],
            ['vendas', Package, 'Vendas'],
            ['estoque', Archive, 'Estoque'],
            ['manutencao', Wrench, 'Manutenção'],
            ['filamentos', Layers, 'Filamentos'],
            ['config', Settings, 'Config'],
          ] as [Tab, typeof Settings, string][]).map(([t, Icon, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap relative ${tab===t ? 'border-gold text-gold' : 'border-transparent text-white/40 hover:text-white/70'}`}>
              <Icon size={13} />{label}
              {t==='manutencao' && overdueTasks.length > 0 && <span className="absolute top-2 right-1 w-2 h-2 bg-red-400 rounded-full" />}
              {t==='pedidos' && activeOrders.length > 0 && <span className="ml-1 text-xs bg-gold/20 text-gold px-1.5 py-0.5 rounded-full">{activeOrders.length}</span>}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* ══ PAINEL ══ */}
        {tab==='painel' && (
          <div className="space-y-8">
            <h2 className="text-gold font-serif text-lg">Painel Geral</h2>

            {/* Meta do mês */}
            <section className="bg-dark-200 border border-gold/15 rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white/50 text-xs uppercase tracking-wider flex items-center gap-2"><Target size={13} /> Meta — {monthLabel(thisMonth)}</h3>
                <div className="flex items-center gap-2">
                  <input type="number" placeholder="Meta R$" value={goalInput} onChange={(e) => setGoalInput(e.target.value)}
                    className="w-32 bg-dark border border-gold/20 rounded px-3 py-1.5 text-white text-sm outline-none focus:border-gold/50" />
                  <button onClick={saveGoal} className="px-3 py-1.5 bg-gold text-dark text-xs font-bold rounded hover:bg-gold-light transition-colors">Definir</button>
                </div>
              </div>
              <div className="flex items-end justify-between mb-2">
                <span className="text-2xl font-mono font-bold text-white">{fmt(monthRevenue)}</span>
                {thisMonthGoal && <span className="text-white/40 text-sm font-mono">/ {fmt(thisMonthGoal.target)}</span>}
              </div>
              {thisMonthGoal ? (
                <>
                  <div className="h-2.5 bg-dark-300 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${goalPct>=100 ? 'bg-emerald-400' : goalPct>=60 ? 'bg-gold' : 'bg-orange-400'}`} style={{ width:`${goalPct}%` }} />
                  </div>
                  <p className="text-white/30 text-xs mt-1.5">{fmtN(goalPct,1)}% da meta — falta {fmt(Math.max(thisMonthGoal.target-monthRevenue,0))}</p>
                </>
              ) : <p className="text-white/25 text-xs mt-1">Defina uma meta de receita para este mês.</p>}
            </section>

            {/* Histórico de meses */}
            {allMonths.length > 1 && (
              <section>
                <h3 className="text-white/50 text-xs uppercase tracking-wider mb-3">Histórico de Meses</h3>
                <div className="bg-dark-200 border border-gold/10 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gold/10">
                      {['Mês','Meta','Receita','Lucro','Atingido'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-white/35 font-medium text-xs uppercase tracking-wide">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {allMonths.map((m, i) => {
                        const g = goals.find((x) => x.month===m)
                        const rev = getMonthRevenue(m, products)
                        const pct = g && g.target > 0 ? (rev/g.target)*100 : null
                        const monthProfit = products.filter((p) => (p.saleDate||'').startsWith(m)).reduce((s, p) => s+calcProduct(p,filaments,config).netProfit, 0)
                        return (
                          <tr key={m} className={`border-b border-gold/5 ${i%2===1?'bg-dark-200/30':''} ${m===thisMonth?'bg-gold/5':''}`}>
                            <td className="px-4 py-3 font-medium text-white">{monthLabel(m)}{m===thisMonth && <span className="ml-2 text-xs text-gold/60">atual</span>}</td>
                            <td className="px-4 py-3 text-white/50 font-mono">{g ? fmt(g.target) : '—'}</td>
                            <td className="px-4 py-3 text-white font-mono">{fmt(rev)}</td>
                            <td className={`px-4 py-3 font-mono ${monthProfit>=0?'text-emerald-400':'text-red-400'}`}>{fmt(monthProfit)}</td>
                            <td className="px-4 py-3">
                              {pct !== null ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 bg-dark-300 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${pct>=100?'bg-emerald-400':pct>=60?'bg-gold':'bg-orange-400'}`} style={{ width:`${Math.min(pct,100)}%` }} />
                                  </div>
                                  <span className={`text-xs font-mono ${pct>=100?'text-emerald-400':pct>=60?'text-gold':'text-orange-400'}`}>{fmtN(pct,0)}%</span>
                                </div>
                              ) : <span className="text-white/25 text-xs">sem meta</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Alertas manutenção */}
            {(overdueTasks.length > 0 || dueSoonTasks.length > 0) && (
              <section>
                <h3 className="text-white/50 text-xs uppercase tracking-wider mb-3 flex items-center gap-2"><AlertTriangle size={13} /> Alertas de Manutenção</h3>
                <div className="space-y-2">
                  {[...overdueTasks, ...dueSoonTasks].slice(0,4).map((t) => {
                    const s = taskStatus(t, config.printerTotalH)
                    return (
                      <div key={t.id} className={`flex items-center justify-between bg-dark-200 border rounded-lg px-4 py-3 ${s.overdue?'border-red-400/30':'border-yellow-400/30'}`}>
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={13} className={s.color} />
                          <span className="text-white text-sm font-medium">{t.name}</span>
                          <span className={`text-xs ${s.color}`}>{s.label}</span>
                        </div>
                        <button onClick={() => setTab('manutencao')} className="text-white/30 hover:text-gold transition-colors"><ChevronRight size={14} /></button>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Pedidos ativos */}
            {activeOrders.length > 0 && (
              <section>
                <h3 className="text-white/50 text-xs uppercase tracking-wider mb-3 flex items-center gap-2"><ShoppingCart size={13} /> Pedidos Ativos</h3>
                <div className="grid gap-2">
                  {activeOrders.slice(0,3).map((o) => (
                    <div key={o.id} className="flex items-center justify-between bg-dark-200 border border-gold/10 rounded-lg px-4 py-3">
                      <div>
                        <p className="text-white text-sm font-medium">{o.clientName} — {o.productName} ×{o.quantity}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded border ${ORDER_STATUS_COLOR[o.status]}`}>{ORDER_STATUS_LABEL[o.status]}</span>
                          {o.dueDate && <span className="text-white/30 text-xs">entrega: {o.dueDate}</span>}
                          {!o.paid && <span className="text-red-400/60 text-xs">não pago</span>}
                        </div>
                      </div>
                      <span className="text-gold font-mono text-sm">{fmt(o.unitPrice*o.quantity)}</span>
                    </div>
                  ))}
                  {activeOrders.length > 3 && <button onClick={() => setTab('pedidos')} className="text-gold/60 hover:text-gold text-xs text-center py-2 transition-colors">+ {activeOrders.length-3} mais → ver todos</button>}
                </div>
              </section>
            )}

            {/* Resumo financeiro */}
            {products.length > 0 && (
              <>
                <section>
                  <h3 className="text-white/50 text-xs uppercase tracking-wider mb-3 flex items-center gap-2"><DollarSign size={13} /> Resumo Financeiro (Geral)</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Card label="Receita Total" value={fmt(totals.revenue)} sub={`${totals.pieces} peças`} />
                    <Card label="Custo Total" value={fmt(totals.cost)} color="text-white/70" />
                    <Card label="Lucro Líquido" value={fmt(totals.profit)} color={totals.profit>=0?'text-emerald-400':'text-red-400'} />
                    <Card label="Falhas este mês" value={fmt(failsCost)} sub={`${thisMonthFails.length} falhas`} color="text-red-400/70" />
                  </div>
                </section>

                {totals.profit > 0 && (
                  <section>
                    <h3 className="text-white/50 text-xs uppercase tracking-wider mb-3 flex items-center gap-2"><Percent size={13} /> Distribuição do Lucro ({config.reinvestPct}/{config.paymentPct}/{config.reservePct})</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <p className="text-blue-400/70 text-xs uppercase tracking-wider mb-1">Reinvestir — {config.reinvestPct}%</p>
                        <p className="text-blue-400 font-mono font-bold text-xl">{fmt(totals.reinvest)}</p>
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                        <p className="text-emerald-400/70 text-xs uppercase tracking-wider mb-1">Seu Pagamento — {config.paymentPct}%</p>
                        <p className="text-emerald-400 font-mono font-bold text-xl">{fmt(totals.payment)}</p>
                      </div>
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                        <p className="text-purple-400/70 text-xs uppercase tracking-wider mb-1">Reserva — {config.reservePct}%</p>
                        <p className="text-purple-400 font-mono font-bold text-xl">{fmt(totals.reserve)}</p>
                      </div>
                    </div>
                  </section>
                )}

                <section>
                  <h3 className="text-white/50 text-xs uppercase tracking-wider mb-3 flex items-center gap-2"><TrendingUp size={13} /> Produtos por Desempenho</h3>
                  <div className="bg-dark-200 border border-gold/10 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-gold/10">
                        {['Produto','Qtd','Receita','Custo','Lucro','Margem'].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-white/35 font-medium text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {productStats.map((p, i) => {
                          const fil = filaments.find((f) => f.id===p.filamentId)
                          const margin = p.realSellingPrice > 0 ? (p.netProfit/p.realSellingPrice)*100 : 0
                          return (
                            <tr key={p.id} className={`border-b border-gold/5 ${i%2===1?'bg-dark-200/30':''}`}>
                              <td className="px-4 py-3"><div className="flex items-center gap-2">{fil && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor:fil.color }} />}<span className="text-white font-medium">{p.name}</span></div></td>
                              <td className="px-4 py-3 text-white/60 font-mono">{p.quantity}</td>
                              <td className="px-4 py-3 text-white font-mono">{fmt(p.realSellingPrice)}</td>
                              <td className="px-4 py-3 text-white/60 font-mono">{fmt(p.totalCost)}</td>
                              <td className={`px-4 py-3 font-mono font-semibold ${p.netProfit>=0?'text-emerald-400':'text-red-400'}`}>{fmt(p.netProfit)}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-14 h-1.5 bg-dark-300 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${margin>=50?'bg-emerald-400':margin>=20?'bg-yellow-400':'bg-red-400'}`} style={{ width:`${Math.min(Math.max(margin,0),100)}%` }} />
                                  </div>
                                  <span className={`text-xs font-mono ${margin>=50?'text-emerald-400':margin>=20?'text-yellow-400':'text-red-400'}`}>{fmtN(margin,1)}%</span>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}

            {/* Estoque */}
            {filaments.length > 0 && (
              <section>
                <h3 className="text-white/50 text-xs uppercase tracking-wider mb-3 flex items-center gap-2"><Package size={13} /> Estoque de Filamentos</h3>
                <div className="grid gap-2">
                  {filamentConsumption.map((f) => {
                    const pct = f.stockG > 0 ? Math.min((f.consumedG/f.stockG)*100,100) : 0
                    const lowStock = f.stockG > 0 && f.remainingG < 100
                    return (
                      <div key={f.id} className="flex items-center gap-3 bg-dark-200 border border-gold/10 rounded-lg px-4 py-3">
                        <div className="w-5 h-5 rounded-full border border-white/15 flex-shrink-0" style={{ backgroundColor:f.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white text-sm font-medium">{f.name}</span>
                            {lowStock && <span className={`text-xs px-1.5 py-0.5 rounded border ${f.remainingG<=0?'text-red-400 bg-red-400/10 border-red-400/30':'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'}`}>{f.remainingG<=0?'Esgotado':'Baixo'}</span>}
                          </div>
                          {f.stockG > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-dark-300 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${pct>90?'bg-red-400':pct>70?'bg-yellow-400':'bg-gold'}`} style={{ width:`${pct}%` }} />
                              </div>
                              <span className="text-white/40 text-xs font-mono whitespace-nowrap">{fmtN(f.remainingG,0)}g restantes</span>
                            </div>
                          )}
                        </div>
                        <span className="text-gold font-mono text-sm">{fmt(f.pricePerKg)}/kg</span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ══ PEDIDOS ══ */}
        {tab==='pedidos' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div><h2 className="text-gold font-serif text-lg">Pedidos</h2><p className="text-white/40 text-sm mt-0.5">{activeOrders.length} ativos</p></div>
              {!showOrderForm && <button onClick={openAddOrder} className="flex items-center gap-2 px-4 py-2 border border-gold text-gold text-sm hover:bg-gold hover:text-dark transition-all rounded"><Plus size={14} /> Novo Pedido</button>}
            </div>

            {showOrderForm && (
              <div className="mb-6 bg-dark-200 border border-gold/20 rounded-lg p-5">
                <h3 className="text-white/60 text-xs uppercase tracking-wider mb-4">{editOrderId?'Editar Pedido':'Novo Pedido'}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                  <div><label className="block text-white/40 text-xs mb-1.5">Nome do Cliente</label><input type="text" placeholder="João Silva" value={orderForm.clientName} onChange={(e) => setOrderForm((p) => ({ ...p, clientName:e.target.value }))} className={inputCls} autoFocus /></div>
                  <div><label className="block text-white/40 text-xs mb-1.5">Contato</label><input type="text" placeholder="(48) 99999-9999" value={orderForm.clientContact} onChange={(e) => setOrderForm((p) => ({ ...p, clientContact:e.target.value }))} className={inputCls} /></div>
                  <div>
                    <label className="block text-white/40 text-xs mb-1.5">Produto</label>
                    <select value={orderForm.productName} onChange={(e) => setOrderForm((p) => ({ ...p, productName:e.target.value }))} className={selectCls}>
                      <option value="">Selecione ou escreva abaixo</option>
                      {[...new Set(products.map((p) => p.name))].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <input type="text" placeholder="Ou escreva o produto" value={orderForm.productName} onChange={(e) => setOrderForm((p) => ({ ...p, productName:e.target.value }))} className={`${inputCls} mt-1`} />
                  </div>
                  <div><label className="block text-white/40 text-xs mb-1.5">Quantidade</label><input type="number" min="1" value={orderForm.quantity} onChange={(e) => setOrderForm((p) => ({ ...p, quantity:e.target.value }))} className={inputCls} /></div>
                  <div><label className="block text-white/40 text-xs mb-1.5">Preço Unitário (R$)</label><input type="number" step="0.01" min="0" placeholder="10,00" value={orderForm.unitPrice} onChange={(e) => setOrderForm((p) => ({ ...p, unitPrice:e.target.value }))} className={inputCls} /></div>
                  <div><label className="block text-white/40 text-xs mb-1.5">Prazo de Entrega</label><input type="date" value={orderForm.dueDate} onChange={(e) => setOrderForm((p) => ({ ...p, dueDate:e.target.value }))} className={inputCls} /></div>
                </div>
                <div className="mb-3"><label className="block text-white/40 text-xs mb-1.5">Observações</label><input type="text" placeholder="Cor, tamanho, detalhes..." value={orderForm.notes} onChange={(e) => setOrderForm((p) => ({ ...p, notes:e.target.value }))} className={inputCls} /></div>
                <div className="flex gap-2">
                  <button onClick={saveOrder} className="px-5 py-2 bg-gold text-dark text-sm font-semibold rounded hover:bg-gold-light transition-colors flex items-center gap-2"><Check size={14} /> Salvar</button>
                  <button onClick={() => { setShowOrderForm(false); setEditOrderId(null) }} className="px-4 py-2 border border-white/15 text-white/50 text-sm rounded">Cancelar</button>
                </div>
              </div>
            )}

            {orders.length === 0 ? (
              <div className="text-center py-20 text-white/20"><ShoppingCart size={44} className="mx-auto mb-3" /><p className="text-sm">Nenhum pedido ainda.</p></div>
            ) : (
              <div className="space-y-2">
                {orders.map((o) => {
                  const total = o.unitPrice * o.quantity
                  const nextStatus = ORDER_STATUS_FLOW[ORDER_STATUS_FLOW.indexOf(o.status)+1]
                  return (
                    <div key={o.id} className={`bg-dark-200 border rounded-lg px-4 py-4 ${o.status==='cancelado'?'border-white/5 opacity-50':'border-gold/10'}`}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-semibold">{o.clientName}</span>
                            <span className={`text-xs px-2 py-0.5 rounded border ${ORDER_STATUS_COLOR[o.status]}`}>{ORDER_STATUS_LABEL[o.status]}</span>
                            <button onClick={() => updateOrder(o.id, { paid:!o.paid })} className={`text-xs px-2 py-0.5 rounded border transition-colors ${o.paid?'text-emerald-400 bg-emerald-400/10 border-emerald-400/30':'text-red-400/60 bg-red-400/10 border-red-400/20 hover:border-red-400/40'}`}>
                              {o.paid?'✓ Pago':'Não pago'}
                            </button>
                          </div>
                          <p className="text-white/70 text-sm mt-1">{o.productName} × {o.quantity}</p>
                          {o.notes && <p className="text-white/40 text-xs mt-0.5">{o.notes}</p>}
                          <div className="flex gap-3 mt-1">
                            {o.clientContact && <span className="text-white/35 text-xs">{o.clientContact}</span>}
                            {o.dueDate && <span className="text-white/35 text-xs">entrega: {o.dueDate}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-gold font-mono font-semibold">{fmt(total)}</span>
                          {o.status!=='cancelado' && o.status!=='entregue' && nextStatus && (
                            <button onClick={() => updateOrder(o.id, { status:nextStatus })} className="px-3 py-1.5 bg-gold/10 border border-gold/30 text-gold text-xs rounded hover:bg-gold hover:text-dark transition-all">
                              → {ORDER_STATUS_LABEL[nextStatus]}
                            </button>
                          )}
                          <button onClick={() => openEditOrder(o)} className="text-white/30 hover:text-gold transition-colors p-1"><Edit2 size={13} /></button>
                          {o.status!=='cancelado' && o.status!=='entregue' && <button onClick={() => updateOrder(o.id, { status:'cancelado' })} className="text-white/30 hover:text-red-400 transition-colors p-1"><XCircle size={13} /></button>}
                          <button onClick={() => deleteOrder(o.id)} className="text-white/20 hover:text-red-400 transition-colors p-1"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ MANUTENÇÃO ══ */}
        {tab==='manutencao' && (
          <div className="space-y-8">
            <div className="flex items-center gap-4 bg-dark-200 border border-gold/15 rounded-lg px-5 py-4">
              <Clock size={18} className="text-gold flex-shrink-0" />
              <div className="flex-1"><p className="text-white font-medium text-sm">Total de Horas da Impressora</p><p className="text-white/40 text-xs">Veja no display da Kobra 3 e atualize aqui</p></div>
              <div className="flex items-center gap-2">
                <input type="number" min="0" step="0.5" value={cfgForm.printerTotalH}
                  onChange={(e) => setCfgForm((p) => ({ ...p, printerTotalH:parseFloat(e.target.value)||0 }))}
                  className="w-24 bg-dark border border-gold/20 rounded px-3 py-1.5 text-white text-sm outline-none focus:border-gold/50 text-center" />
                <span className="text-white/40 text-sm">horas</span>
                <button onClick={saveConfig} className="px-3 py-1.5 bg-gold text-dark text-xs font-bold rounded hover:bg-gold-light transition-colors"><Check size={13} /></button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-gold font-serif text-lg">Tarefas de Manutenção</h2>
                <button onClick={() => setShowTaskForm(!showTaskForm)} className="flex items-center gap-2 px-3 py-2 border border-gold/40 text-gold/70 text-xs hover:border-gold hover:text-gold transition-all rounded"><Plus size={12} /> Adicionar</button>
              </div>

              {showTaskForm && (
                <div className="mb-4 bg-dark-200 border border-gold/20 rounded-lg p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                    <div className="col-span-2 sm:col-span-1"><label className="block text-white/40 text-xs mb-1.5">Nome</label><input type="text" placeholder="Troca do extrusor" value={taskForm.name} onChange={(e) => setTaskForm((p) => ({ ...p, name:e.target.value }))} className={inputCls} autoFocus /></div>
                    <div><label className="block text-white/40 text-xs mb-1.5">Intervalo (horas)</label><input type="number" min="1" placeholder="200" value={taskForm.intervalH} onChange={(e) => setTaskForm((p) => ({ ...p, intervalH:e.target.value }))} className={inputCls} /></div>
                    <div><label className="block text-white/40 text-xs mb-1.5">Descrição</label><input type="text" value={taskForm.description} onChange={(e) => setTaskForm((p) => ({ ...p, description:e.target.value }))} className={inputCls} /></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addTask} className="px-4 py-2 bg-gold text-dark text-sm font-semibold rounded flex items-center gap-1.5"><Check size={13} /> Salvar</button>
                    <button onClick={() => setShowTaskForm(false)} className="px-3 py-2 border border-white/15 text-white/50 text-sm rounded"><X size={13} /></button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {tasks.map((t) => {
                  const s = taskStatus(t, config.printerTotalH)
                  return (
                    <div key={t.id} className={`bg-dark-200 border rounded-lg p-4 ${s.overdue?'border-red-400/30':s.pct>85?'border-yellow-400/20':'border-gold/10'}`}>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <AlertTriangle size={13} className={s.overdue?'text-red-400':s.pct>85?'text-yellow-400':'text-emerald-400/40'} />
                            <span className="text-white font-medium text-sm">{t.name}</span>
                          </div>
                          {t.description && <p className="text-white/40 text-xs mt-0.5 ml-5">{t.description}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => markDone(t.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 text-xs rounded hover:bg-emerald-400/20 transition-colors"><Check size={11} /> Feito agora</button>
                          <button onClick={() => deleteTask(t.id)} className="text-white/25 hover:text-red-400 transition-colors p-1"><Trash2 size={12} /></button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-dark-300 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${s.overdue?'bg-red-400':s.pct>85?'bg-yellow-400':'bg-emerald-400'}`} style={{ width:`${s.pct}%` }} />
                        </div>
                        <span className={`text-xs font-mono whitespace-nowrap ${s.color}`}>{s.label}</span>
                      </div>
                      <p className="text-white/25 text-xs mt-1.5">A cada {fmtN(t.intervalH)}h — última vez: {fmtN(t.lastDoneAtH)}h</p>
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-gold font-serif text-lg">Registro de Falhas</h2>
                <button onClick={() => setShowFailForm(!showFailForm)} className="flex items-center gap-2 px-3 py-2 border border-red-400/30 text-red-400/70 text-xs hover:border-red-400 hover:text-red-400 transition-all rounded"><Plus size={12} /> Registrar falha</button>
              </div>

              {showFailForm && (
                <div className="mb-4 bg-dark-200 border border-red-400/20 rounded-lg p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                    <div className="col-span-2 sm:col-span-1"><label className="block text-white/40 text-xs mb-1.5">O que tentava imprimir</label><input type="text" placeholder="Chaveiro do Batman" value={failForm.description} onChange={(e) => setFailForm((p) => ({ ...p, description:e.target.value }))} className={inputCls} autoFocus /></div>
                    <div><label className="block text-white/40 text-xs mb-1.5">Filamento</label><select value={failForm.filamentId} onChange={(e) => setFailForm((p) => ({ ...p, filamentId:e.target.value }))} className={selectCls}><option value="">Sem filamento</option>{filaments.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
                    <div><label className="block text-white/40 text-xs mb-1.5">Motivo</label><select value={failForm.reason} onChange={(e) => setFailForm((p) => ({ ...p, reason:e.target.value }))} className={selectCls}>{Object.entries(FAIL_REASONS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                    <div><label className="block text-white/40 text-xs mb-1.5">Filamento perdido (g)</label><input type="number" step="0.1" min="0" placeholder="50" value={failForm.wastedG} onChange={(e) => setFailForm((p) => ({ ...p, wastedG:e.target.value }))} className={inputCls} /></div>
                    <div><label className="block text-white/40 text-xs mb-1.5">Tempo perdido (h)</label><input type="number" step="0.5" min="0" placeholder="2" value={failForm.wastedTimeH} onChange={(e) => setFailForm((p) => ({ ...p, wastedTimeH:e.target.value }))} className={inputCls} /></div>
                    <div><label className="block text-white/40 text-xs mb-1.5">Data</label><input type="date" value={failForm.date} onChange={(e) => setFailForm((p) => ({ ...p, date:e.target.value }))} className={inputCls} /></div>
                  </div>
                  <div className="mb-3"><label className="block text-white/40 text-xs mb-1.5">Observações</label><input type="text" placeholder="Temperatura baixa, filamento vencido..." value={failForm.notes} onChange={(e) => setFailForm((p) => ({ ...p, notes:e.target.value }))} className={inputCls} /></div>
                  <div className="flex gap-2">
                    <button onClick={saveFail} className="px-4 py-2 bg-red-500/80 text-white text-sm font-semibold rounded hover:bg-red-500 transition-colors flex items-center gap-1.5"><Check size={13} /> Registrar</button>
                    <button onClick={() => setShowFailForm(false)} className="px-3 py-2 border border-white/15 text-white/50 text-sm rounded"><X size={13} /></button>
                  </div>
                </div>
              )}

              {fails.length === 0 ? (
                <div className="text-center py-10 text-white/20"><p className="text-sm">Nenhuma falha registrada. Ótimo sinal!</p></div>
              ) : (
                <div className="space-y-2">
                  {fails.map((f) => {
                    const cost = calcFailedCost(f, filaments, config)
                    const fil = filaments.find((x) => x.id===f.filamentId)
                    return (
                      <div key={f.id} className="flex items-center gap-3 bg-dark-200 border border-red-400/10 rounded-lg px-4 py-3">
                        <XCircle size={14} className="text-red-400/50 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">{f.description}</p>
                          <p className="text-white/40 text-xs mt-0.5">{FAIL_REASONS[f.reason]} · {f.wastedG}g · {f.wastedTimeH}h{fil && <span> · <span style={{ color:fil.color }}>■</span> {fil.name}</span>}{f.notes && <span> · {f.notes}</span>}</p>
                        </div>
                        <div className="text-right flex-shrink-0"><p className="text-red-400 font-mono text-sm">{fmt(cost)}</p><p className="text-white/30 text-xs">{f.date}</p></div>
                        <button onClick={() => deleteFail(f.id)} className="text-white/20 hover:text-red-400 transition-colors p-1"><Trash2 size={12} /></button>
                      </div>
                    )
                  })}
                  <div className="flex justify-end pt-1"><p className="text-white/40 text-xs">Total em falhas: <span className="text-red-400 font-mono">{fmt(fails.reduce((s,f) => s+calcFailedCost(f,filaments,config),0))}</span></p></div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ FILAMENTOS ══ */}
        {tab==='filamentos' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div><h2 className="text-gold font-serif text-lg">Filamentos</h2><p className="text-white/40 text-sm mt-0.5">{filaments.length} cadastrados</p></div>
              {!showFilForm && <button onClick={openAddFil} className="flex items-center gap-2 px-4 py-2 border border-gold text-gold text-sm hover:bg-gold hover:text-dark transition-all rounded"><Plus size={14} /> Adicionar Filamento</button>}
            </div>

            {showFilForm && (
              <div className="mb-6 bg-dark-200 border border-gold/20 rounded-lg p-5">
                <h3 className="text-white/60 text-xs uppercase tracking-wider mb-4">{editFilId?'Editar':'Novo Filamento'}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <div className="col-span-2 sm:col-span-1"><label className="block text-white/40 text-xs mb-1.5">Nome</label><input type="text" placeholder="PLA Preto" value={filForm.name} onChange={(e) => setFilForm((p) => ({ ...p, name:e.target.value }))} className={inputCls} autoFocus /></div>
                  <div>
                    <label className="block text-white/40 text-xs mb-1.5">Material</label>
                    <select value={filForm.material} onChange={(e) => { const mat=MATERIALS[e.target.value]; setFilForm((p) => ({ ...p, material:e.target.value, ...(mat?{ nozzleTempC:String(mat.nozzleTempC), bedTempC:String(mat.bedTempC) }:{}) })) }} className={selectCls}>
                      {Object.keys(MATERIALS).map((m) => <option key={m} value={m}>{m}</option>)}
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div><label className="block text-white/40 text-xs mb-1.5">Cor</label><input type="color" value={filForm.color} onChange={(e) => setFilForm((p) => ({ ...p, color:e.target.value }))} className="w-full h-9 rounded cursor-pointer border border-gold/20 bg-transparent p-0.5" /></div>
                  <div><label className="block text-white/40 text-xs mb-1.5">Preço/kg (R$)</label><input type="number" step="0.01" min="0" placeholder="79,90" value={filForm.pricePerKg} onChange={(e) => setFilForm((p) => ({ ...p, pricePerKg:e.target.value }))} className={inputCls} /></div>
                  <div><label className="block text-white/40 text-xs mb-1.5">Estoque (g)</label><input type="number" min="0" placeholder="1000" value={filForm.stockG} onChange={(e) => setFilForm((p) => ({ ...p, stockG:e.target.value }))} className={inputCls} /></div>
                  <div><label className="block text-white/40 text-xs mb-1.5 flex items-center gap-1"><Thermometer size={10}/> Bico (°C)</label><input type="number" value={filForm.nozzleTempC} onChange={(e) => setFilForm((p) => ({ ...p, nozzleTempC:e.target.value }))} className={inputCls} /></div>
                  <div><label className="block text-white/40 text-xs mb-1.5 flex items-center gap-1"><Thermometer size={10}/> Mesa (°C)</label><input type="number" value={filForm.bedTempC} onChange={(e) => setFilForm((p) => ({ ...p, bedTempC:e.target.value }))} className={inputCls} /></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveFil} className="px-4 py-2 bg-gold text-dark text-sm font-semibold rounded hover:bg-gold-light transition-colors flex items-center gap-1.5"><Check size={14} /> Salvar</button>
                  <button onClick={() => { setShowFilForm(false); setEditFilId(null) }} className="px-3 py-2 border border-white/15 text-white/50 text-sm rounded"><X size={14} /></button>
                </div>
              </div>
            )}

            {filaments.length === 0 ? (
              <div className="text-center py-20 text-white/20"><Layers size={44} className="mx-auto mb-3" /><p className="text-sm">Nenhum filamento cadastrado.</p></div>
            ) : (
              <div className="grid gap-2">
                {filaments.map((f) => {
                  const consumed = products.filter((p) => p.filamentId===f.id).reduce((s,p) => s+p.weightPerPieceG*p.quantity, 0)
                  const remaining = (f.stockG||0) - consumed
                  return (
                    <div key={f.id} className="bg-dark-200 border border-gold/10 rounded-lg px-4 py-3 hover:border-gold/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full border-2 border-white/15 flex-shrink-0" style={{ backgroundColor:f.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-medium">{f.name}</span>
                            <span className="text-white/30 text-xs border border-white/10 px-1.5 rounded">{f.material||'PLA'}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            {f.nozzleTempC > 0 && <span className="text-orange-400/60 text-xs">Bico: {f.nozzleTempC}°C</span>}
                            {f.bedTempC > 0 && <span className="text-orange-400/60 text-xs">Mesa: {f.bedTempC}°C</span>}
                            {f.stockG > 0 && <span className="text-white/30 text-xs">Restante: <span className={remaining>=0?'text-emerald-400/60':'text-red-400/60'}>{fmtN(remaining,0)}g</span></span>}
                          </div>
                        </div>
                        <span className="text-gold font-mono text-sm">{fmt(f.pricePerKg)}<span className="text-white/30 text-xs">/kg</span></span>
                        <div className="flex gap-1">
                          <button onClick={() => openEditFil(f)} className="text-white/30 hover:text-gold transition-colors p-1.5"><Edit2 size={13} /></button>
                          <button onClick={() => deleteFil(f.id)} className="text-white/30 hover:text-red-400 transition-colors p-1.5"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ VENDAS ══ */}
        {tab==='vendas' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div><h2 className="text-gold font-serif text-lg">Vendas</h2><p className="text-white/40 text-sm mt-0.5">{products.length} vendas registradas</p></div>
              {!showProdForm && <button onClick={openAddProd} className="flex items-center gap-2 px-4 py-2 border border-gold text-gold text-sm hover:bg-gold hover:text-dark transition-all rounded"><Plus size={14} /> Registrar Venda</button>}
            </div>

            {showProdForm && (
              <div className="mb-8 bg-dark-200 border border-gold/20 rounded-lg p-5">
                <h3 className="text-white/60 text-xs uppercase tracking-wider mb-4">{editProdId?'Editar Venda':'Nova Venda'}</h3>
                {/* Seletor do estoque */}
                {stockItems.length > 0 && !editProdId && (
                  <div className="mb-4 p-3 bg-dark-300/50 border border-gold/10 rounded-lg">
                    <label className="block text-white/40 text-xs mb-1.5">Selecionar do Estoque (preenche campos automaticamente)</label>
                    <select
                      value={prodForm.stockItemId}
                      onChange={(e) => {
                        const si = stockItems.find((s) => s.id === e.target.value)
                        if (si) {
                          setProdForm((p) => ({ ...p, stockItemId:e.target.value, name:si.name, filamentId:si.filamentId, weightPerPieceG:String(si.weightPerPieceG), infillPct:String(si.infillPct), purgeWasteG:String(si.purgeWasteG), printTimeH:String(si.printTimeH) }))
                        } else {
                          setProdForm((p) => ({ ...p, stockItemId:'' }))
                        }
                      }}
                      className={selectCls}
                    >
                      <option value="">— Preencher manualmente —</option>
                      {stockItems.map((s) => {
                        const fil = filaments.find((f) => f.id === s.filamentId)
                        const calc = calcProduct({ id:'', name:'', quantity:1, filamentId:s.filamentId, weightPerPieceG:s.weightPerPieceG, infillPct:s.infillPct, purgeWasteG:s.purgeWasteG, printTimeH:s.printTimeH, realSellingPrice:0, saleDate:'' }, filaments, config)
                        return <option key={s.id} value={s.id}>{s.name}{fil?` (${fil.name})`:''} — Sugerido: {fmt(calc.suggestedPrice)} — Estoque: {s.stockQty} un.</option>
                      })}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <div className="col-span-2 sm:col-span-1"><label className="block text-white/40 text-xs mb-1.5">Nome do Produto</label><input type="text" placeholder="Chaveiro" value={prodForm.name} onChange={(e) => setProdForm((p) => ({ ...p, name:e.target.value }))} className={inputCls} autoFocus /></div>
                  <div><label className="block text-white/40 text-xs mb-1.5">Filamento</label><select value={prodForm.filamentId} onChange={(e) => setProdForm((p) => ({ ...p, filamentId:e.target.value }))} className={selectCls}><option value="">Selecione...</option>{filaments.map((f) => <option key={f.id} value={f.id}>{f.name} — {fmt(f.pricePerKg)}/kg</option>)}</select></div>
                  <div><label className="block text-white/40 text-xs mb-1.5">Quantidade</label><input type="number" min="1" value={prodForm.quantity} onChange={(e) => setProdForm((p) => ({ ...p, quantity:e.target.value }))} className={inputCls} /></div>
                  <div><label className="block text-white/40 text-xs mb-1.5">Data da Venda</label><input type="date" value={prodForm.saleDate} onChange={(e) => setProdForm((p) => ({ ...p, saleDate:e.target.value }))} className={inputCls} /></div>
                  <div><label className="block text-white/40 text-xs mb-1.5">Peso por peça (g)</label><input type="number" step="0.1" min="0" placeholder="5" value={prodForm.weightPerPieceG} onChange={(e) => setProdForm((p) => ({ ...p, weightPerPieceG:e.target.value }))} className={inputCls} /></div>
                  <div><label className="block text-white/40 text-xs mb-1.5">Tempo por peça (h)</label><input type="number" step="0.5" min="0" placeholder="1" value={prodForm.printTimeH} onChange={(e) => setProdForm((p) => ({ ...p, printTimeH:e.target.value }))} className={inputCls} /></div>
                  <div><label className="block text-white/40 text-xs mb-1.5">Infill (%)</label><input type="number" min="5" max="100" step="5" value={prodForm.infillPct} onChange={(e) => setProdForm((p) => ({ ...p, infillPct:e.target.value }))} className={inputCls} /></div>
                  <div><label className="block text-white/40 text-xs mb-1.5">Purga AMS (g)</label><input type="number" step="0.5" min="0" value={prodForm.purgeWasteG} onChange={(e) => setProdForm((p) => ({ ...p, purgeWasteG:e.target.value }))} className={inputCls} /></div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-white/40 text-xs mb-1.5">Total recebido (R$)</label>
                    <input type="number" step="0.01" min="0" placeholder="50,00" value={prodForm.realSellingPrice} onChange={(e) => setProdForm((p) => ({ ...p, realSellingPrice:e.target.value }))} className={inputCls} />
                    {previewCalc && <p className="text-yellow-400/80 text-xs mt-1">Sugerido: {fmt(previewCalc.suggestedPrice)}</p>}
                  </div>
                </div>
                {previewCalc && (
                  <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-dark-300/60 rounded-lg p-4 border border-gold/10">
                    <div><p className="text-white/35 text-xs mb-0.5">Custo Total</p><p className="text-white font-mono font-semibold">{fmt(previewCalc.totalCost)}</p></div>
                    <div><p className="text-white/35 text-xs mb-0.5">Sugerido (3×)</p><p className="text-yellow-400 font-mono">{fmt(previewCalc.suggestedPrice)}</p></div>
                    <div><p className="text-white/35 text-xs mb-0.5">Lucro</p><p className={`font-mono font-semibold ${previewCalc.netProfit>=0?'text-emerald-400':'text-red-400'}`}>{fmt(previewCalc.netProfit)}</p></div>
                    <div><p className="text-white/35 text-xs mb-0.5">Seu Pagamento</p><p className="text-emerald-400/80 font-mono">{fmt(previewCalc.payment)}</p></div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={saveProd} className="px-5 py-2 bg-gold text-dark text-sm font-semibold rounded hover:bg-gold-light transition-colors flex items-center gap-2"><Check size={14} /> Salvar</button>
                  <button onClick={() => { setShowProdForm(false); setEditProdId(null) }} className="px-4 py-2 border border-white/15 text-white/50 text-sm rounded">Cancelar</button>
                </div>
              </div>
            )}

            {products.length === 0 ? (
              <div className="text-center py-20 text-white/20"><Package size={44} className="mx-auto mb-3" /><p className="text-sm">Nenhuma venda registrada ainda.</p></div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gold/10">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead><tr className="bg-dark-300 border-b border-gold/10">
                    {['Item','Data','Qtd','Fil./kg','Peso','Infill','Tempo','Custo','Sugerido 3×','Venda','Lucro','Reinvestir','Pagamento','Reserva',''].map((h) => (
                      <th key={h} className="text-left px-3 py-3 text-white/35 font-medium text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {products.map((p, i) => {
                      const fil = filaments.find((f) => f.id===p.filamentId)
                      const c = calcProduct(p, filaments, config)
                      return (
                        <tr key={p.id} className={`border-b border-gold/5 hover:bg-dark-200/60 transition-colors ${i%2===1?'bg-dark-200/20':''}`}>
                          <td className="px-3 py-3 font-medium text-white"><div className="flex items-center gap-2">{fil && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor:fil.color }} />}{p.name}</div></td>
                          <td className="px-3 py-3 text-white/40 font-mono text-xs">{p.saleDate||'—'}</td>
                          <td className="px-3 py-3 text-white/60">{p.quantity}</td>
                          <td className="px-3 py-3 text-white/70 font-mono">{fil?fmt(fil.pricePerKg):'—'}</td>
                          <td className="px-3 py-3 text-white/60 font-mono">{p.weightPerPieceG}g</td>
                          <td className="px-3 py-3 text-white/50 font-mono">{p.infillPct||15}%</td>
                          <td className="px-3 py-3 text-white/60 font-mono">{p.printTimeH}h</td>
                          <td className="px-3 py-3 text-white font-mono">{fmt(c.totalCost)}</td>
                          <td className="px-3 py-3 text-yellow-400/80 font-mono">{fmt(c.suggestedPrice)}</td>
                          <td className="px-3 py-3 text-white font-mono">{fmt(p.realSellingPrice)}</td>
                          <td className={`px-3 py-3 font-mono font-semibold ${c.netProfit>=0?'text-emerald-400':'text-red-400'}`}>{fmt(c.netProfit)}</td>
                          <td className="px-3 py-3 text-blue-400/70 font-mono">{fmt(c.reinvest)}</td>
                          <td className="px-3 py-3 text-emerald-400/70 font-mono">{fmt(c.payment)}</td>
                          <td className="px-3 py-3 text-purple-400/70 font-mono">{fmt(c.reserve)}</td>
                          <td className="px-3 py-3"><div className="flex gap-1"><button onClick={() => openEditProd(p)} className="text-white/30 hover:text-gold transition-colors p-1"><Edit2 size={12} /></button><button onClick={() => deleteProd(p.id)} className="text-white/30 hover:text-red-400 transition-colors p-1"><Trash2 size={12} /></button></div></td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {products.length > 1 && (
                    <tfoot><tr className="bg-dark-300 border-t-2 border-gold/20">
                      <td colSpan={7} className="px-3 py-3 text-white/40 text-xs uppercase tracking-wider font-semibold">Totais</td>
                      <td className="px-3 py-3 text-white font-mono font-bold">{fmt(totals.cost)}</td>
                      <td />
                      <td className="px-3 py-3 text-white font-mono font-bold">{fmt(totals.revenue)}</td>
                      <td className={`px-3 py-3 font-mono font-bold ${totals.profit>=0?'text-emerald-400':'text-red-400'}`}>{fmt(totals.profit)}</td>
                      <td className="px-3 py-3 text-blue-400 font-mono font-bold">{fmt(totals.reinvest)}</td>
                      <td className="px-3 py-3 text-emerald-400 font-mono font-bold">{fmt(totals.payment)}</td>
                      <td className="px-3 py-3 text-purple-400 font-mono font-bold">{fmt(totals.reserve)}</td>
                      <td />
                    </tr></tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══ ESTOQUE ══ */}
        {tab==='estoque' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div><h2 className="text-gold font-serif text-lg">Estoque de Produtos</h2><p className="text-white/40 text-sm mt-0.5">Catálogo de produtos prontos para venda</p></div>
              {!showStockForm && <button onClick={openAddStock} className="flex items-center gap-2 px-4 py-2 border border-gold text-gold text-sm hover:bg-gold hover:text-dark transition-all rounded"><Plus size={14} /> Adicionar Produto</button>}
            </div>

            {showStockForm && (
              <div className="mb-6 bg-dark-200 border border-gold/20 rounded-lg p-5">
                <h3 className="text-white/60 text-xs uppercase tracking-wider mb-4">{editStockId?'Editar Produto':'Novo Produto no Estoque'}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <div className="col-span-2 sm:col-span-1"><label className="block text-white/40 text-xs mb-1.5">Nome do Produto</label><input type="text" placeholder="Chaveiro Batman" value={stockForm.name} onChange={(e) => setStockForm((p) => ({ ...p, name:e.target.value }))} className={inputCls} autoFocus /></div>
                  <div><label className="block text-white/40 text-xs mb-1.5">Filamento</label><select value={stockForm.filamentId} onChange={(e) => setStockForm((p) => ({ ...p, filamentId:e.target.value }))} className={selectCls}><option value="">Selecione...</option>{filaments.map((f) => <option key={f.id} value={f.id}>{f.name} — {fmt(f.pricePerKg)}/kg</option>)}</select></div>
                  <div><label className="block text-white/40 text-xs mb-1.5">Peso por peça (g)</label><input type="number" step="0.1" min="0" placeholder="5" value={stockForm.weightPerPieceG} onChange={(e) => setStockForm((p) => ({ ...p, weightPerPieceG:e.target.value }))} className={inputCls} /></div>
                  <div><label className="block text-white/40 text-xs mb-1.5">Tempo de impressão (h)</label><input type="number" step="0.5" min="0" placeholder="1" value={stockForm.printTimeH} onChange={(e) => setStockForm((p) => ({ ...p, printTimeH:e.target.value }))} className={inputCls} /></div>
                  <div><label className="block text-white/40 text-xs mb-1.5">Infill (%)</label><input type="number" min="5" max="100" step="5" value={stockForm.infillPct} onChange={(e) => setStockForm((p) => ({ ...p, infillPct:e.target.value }))} className={inputCls} /></div>
                  <div><label className="block text-white/40 text-xs mb-1.5">Purga AMS (g)</label><input type="number" step="0.5" min="0" value={stockForm.purgeWasteG} onChange={(e) => setStockForm((p) => ({ ...p, purgeWasteG:e.target.value }))} className={inputCls} /></div>
                  <div><label className="block text-white/40 text-xs mb-1.5">Quantidade em estoque</label><input type="number" min="0" placeholder="0" value={stockForm.stockQty} onChange={(e) => setStockForm((p) => ({ ...p, stockQty:e.target.value }))} className={inputCls} /></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveStock} className="px-4 py-2 bg-gold text-dark text-sm font-semibold rounded hover:bg-gold-light transition-colors flex items-center gap-1.5"><Check size={14} /> Salvar</button>
                  <button onClick={() => { setShowStockForm(false); setEditStockId(null) }} className="px-3 py-2 border border-white/15 text-white/50 text-sm rounded"><X size={14} /></button>
                </div>
              </div>
            )}

            {stockItems.length === 0 ? (
              <div className="text-center py-20 text-white/20"><Archive size={44} className="mx-auto mb-3" /><p className="text-sm">Nenhum produto no catálogo ainda.</p><p className="text-xs mt-1">Adicione produtos para selecioná-los rapidamente na aba Vendas.</p></div>
            ) : (
              <div className="grid gap-3">
                {stockItems.map((s) => {
                  const fil = filaments.find((f) => f.id === s.filamentId)
                  const calc = calcProduct({ id:'', name:'', quantity:1, filamentId:s.filamentId, weightPerPieceG:s.weightPerPieceG, infillPct:s.infillPct, purgeWasteG:s.purgeWasteG, printTimeH:s.printTimeH, realSellingPrice:0, saleDate:'' }, filaments, config)
                  const lowStock = s.stockQty <= 2
                  return (
                    <div key={s.id} className={`bg-dark-200 border rounded-lg px-5 py-4 ${lowStock && s.stockQty === 0 ? 'border-red-400/20' : lowStock ? 'border-yellow-400/20' : 'border-gold/10'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {fil && <div className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0" style={{ backgroundColor:fil.color }} />}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-white font-semibold">{s.name}</span>
                              {fil && <span className="text-white/30 text-xs border border-white/10 px-1.5 rounded">{fil.name}</span>}
                              {s.stockQty === 0 && <span className="text-xs px-1.5 py-0.5 rounded border text-red-400 bg-red-400/10 border-red-400/30">Sem estoque</span>}
                              {s.stockQty > 0 && lowStock && <span className="text-xs px-1.5 py-0.5 rounded border text-yellow-400 bg-yellow-400/10 border-yellow-400/30">Estoque baixo</span>}
                            </div>
                            <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                              <span className="text-white/40 text-xs">{s.weightPerPieceG}g · {s.printTimeH}h · infill {s.infillPct}%</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-white/35 text-xs">Custo/peça</p>
                            <p className="text-white font-mono text-sm">{fmt(calc.totalCost)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-white/35 text-xs">Sugerido (3×)</p>
                            <p className="text-yellow-400 font-mono font-semibold">{fmt(calc.suggestedPrice)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-white/35 text-xs mb-1">Estoque</p>
                            <div className="flex items-center gap-1">
                              <button onClick={() => addStockQty(s.id, -1)} className="w-6 h-6 flex items-center justify-center rounded border border-white/15 text-white/40 hover:text-red-400 hover:border-red-400/30 transition-colors"><Minus size={10} /></button>
                              <span className={`w-8 text-center font-mono font-bold text-sm ${s.stockQty===0?'text-red-400':s.stockQty<=2?'text-yellow-400':'text-emerald-400'}`}>{s.stockQty}</span>
                              <button onClick={() => addStockQty(s.id, 1)} className="w-6 h-6 flex items-center justify-center rounded border border-white/15 text-white/40 hover:text-emerald-400 hover:border-emerald-400/30 transition-colors"><Plus size={10} /></button>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => openEditStock(s)} className="text-white/30 hover:text-gold transition-colors p-1.5"><Edit2 size={13} /></button>
                            <button onClick={() => deleteStock(s.id)} className="text-white/30 hover:text-red-400 transition-colors p-1.5"><Trash2 size={13} /></button>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gold/10 flex items-center gap-2">
                        <button onClick={() => { openAddProd(); setProdForm((p) => ({ ...p, stockItemId:s.id, name:s.name, filamentId:s.filamentId, weightPerPieceG:String(s.weightPerPieceG), infillPct:String(s.infillPct), purgeWasteG:String(s.purgeWasteG), printTimeH:String(s.printTimeH) })); setTab('vendas') }} className="flex items-center gap-1.5 text-xs text-gold/70 hover:text-gold transition-colors">
                          <Package size={11} /> Registrar venda deste produto
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ CONFIG ══ */}
        {tab==='config' && (
          <div className="max-w-lg space-y-6">
            <div><h2 className="text-gold font-serif text-lg">Configurações</h2><p className="text-white/40 text-sm mt-1">Custos e distribuição de lucro.</p></div>

            <div className="bg-dark-200 border border-gold/15 rounded-lg p-6 space-y-5">
              <p className="text-white/50 text-xs uppercase tracking-wider">Custos de Operação</p>
              <div><label className="block text-white/40 text-xs mb-1.5">Preço da Energia (R$/kWh)</label><input type="number" step="0.01" min="0" value={cfgForm.electricityKwh} onChange={(e) => setCfgForm((p) => ({ ...p, electricityKwh:parseFloat(e.target.value)||0 }))} className={inputCls} /><p className="text-white/25 text-xs mt-1">Verifique sua conta de luz</p></div>
              <div><label className="block text-white/40 text-xs mb-1.5">Potência da Impressora (W)</label><input type="number" step="10" min="0" value={cfgForm.printerWatts} onChange={(e) => setCfgForm((p) => ({ ...p, printerWatts:parseFloat(e.target.value)||0 }))} className={inputCls} /><p className="text-white/25 text-xs mt-1">Anycubic Kobra 3 Combo ≈ 500W</p></div>
              <div><label className="block text-white/40 text-xs mb-1.5">Depreciação da Máquina (R$/hora)</label><input type="number" step="0.01" min="0" value={cfgForm.depreciationPerHour} onChange={(e) => setCfgForm((p) => ({ ...p, depreciationPerHour:parseFloat(e.target.value)||0 }))} className={inputCls} /></div>

              <div className="border-t border-gold/10 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-white/50 text-xs uppercase tracking-wider">Distribuição do Lucro (%)</p>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded border ${pctValid?'text-emerald-400 bg-emerald-400/10 border-emerald-400/30':'text-red-400 bg-red-400/10 border-red-400/30'}`}>
                    Total: {fmtN(totalPct,1)}%{pctValid?' ✓':' ≠ 100%'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-blue-400/70 text-xs mb-1.5">Reinvestir (%)</label>
                    <input type="number" min="0" max="100" step="5" value={cfgForm.reinvestPct} onChange={(e) => setCfgForm((p) => ({ ...p, reinvestPct:parseFloat(e.target.value)||0 }))} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-emerald-400/70 text-xs mb-1.5">Seu Pagamento (%)</label>
                    <input type="number" min="0" max="100" step="5" value={cfgForm.paymentPct} onChange={(e) => setCfgForm((p) => ({ ...p, paymentPct:parseFloat(e.target.value)||0 }))} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-purple-400/70 text-xs mb-1.5">Reserva (%)</label>
                    <input type="number" min="0" max="100" step="5" value={cfgForm.reservePct} onChange={(e) => setCfgForm((p) => ({ ...p, reservePct:parseFloat(e.target.value)||0 }))} className={inputCls} />
                  </div>
                </div>
                {!pctValid && <p className="text-red-400/70 text-xs mt-2">A soma das porcentagens precisa ser exatamente 100%.</p>}
              </div>

              <button onClick={saveConfig} disabled={!pctValid} className="w-full py-2.5 bg-gold text-dark text-sm font-semibold rounded hover:bg-gold-light transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                {cfgSaved ? <><Check size={14} /> Salvo!</> : 'Salvar Configurações'}
              </button>
            </div>

            <div className="bg-dark-300/50 border border-gold/10 rounded-lg p-4 space-y-1.5">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Custo fixo / hora de impressão</p>
              <p className="text-white/60 text-sm">Eletricidade: <span className="text-gold font-mono">{fmt((config.printerWatts/1000)*config.electricityKwh)}/h</span></p>
              <p className="text-white/60 text-sm">Depreciação: <span className="text-gold font-mono">{fmt(config.depreciationPerHour)}/h</span></p>
              <p className="text-white/60 text-sm border-t border-gold/10 pt-2">Total/hora: <span className="text-gold font-mono font-semibold">{fmt((config.printerWatts/1000)*config.electricityKwh+config.depreciationPerHour)}/h</span></p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
