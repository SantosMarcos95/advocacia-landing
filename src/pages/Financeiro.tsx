import { useState, useEffect } from 'react'
import {
  collection, addDoc, doc, updateDoc, deleteDoc,
  onSnapshot, orderBy, query,
} from 'firebase/firestore'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import type { User } from 'firebase/auth'
import {
  Plus, Trash2, Edit2, Check, X, LogOut, FileText,
  TrendingUp, TrendingDown, DollarSign, AlertTriangle,
  Calendar, CreditCard, LayoutDashboard, ChevronDown,
} from 'lucide-react'
import { auth, db, googleProvider, ADMIN_EMAILS } from '../lib/firebase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Recebivel {
  id: string
  clienteName: string
  processo: string
  valor: number
  dataVencimento: string
  status: 'pendente' | 'recebido'
  recorrente: boolean
  observacoes: string
  criadoEm: number
}

interface Pagamento {
  id: string
  descricao: string
  categoria: string
  valor: number
  dataVencimento: string
  status: 'pendente' | 'pago'
  recorrente: boolean
  origem: 'manual' | 'fatura'
  observacoes: string
  criadoEm: number
}

interface FaturaItem {
  data: string
  descricao: string
  valor: number
  categoria: string
  selecionado: boolean
}

type Tab = 'dashboard' | 'receber' | 'pagar' | 'fatura'

// ─── Constants ────────────────────────────────────────────────────────────────

export const CATEGORIAS = [
  'Alimentação', 'Transporte', 'Saúde', 'Assinaturas',
  'Educação', 'Serviços', 'Impostos/Taxas', 'Moradia',
  'Lazer', 'Vestuário', 'Escritório', 'Outros',
]

const KEYWORDS: Array<[string, string]> = [
  ['ifood', 'Alimentação'], ['ifd*', 'Alimentação'], ['delivery', 'Alimentação'],
  ['restaurante', 'Alimentação'], ['lanchonete', 'Alimentação'], ['padaria', 'Alimentação'],
  ['supermercado', 'Alimentação'], ['mercado', 'Alimentação'], ['hortifruti', 'Alimentação'],
  ['mcdonald', 'Alimentação'], ['burger', 'Alimentação'], ['pizza', 'Alimentação'],
  ['starbucks', 'Alimentação'], ['subway', 'Alimentação'], ['rappi', 'Alimentação'],
  ['uber', 'Transporte'], ['99app', 'Transporte'], ['99 ', 'Transporte'],
  ['taxi', 'Transporte'], ['combustivel', 'Transporte'], ['gasolina', 'Transporte'],
  ['posto', 'Transporte'], ['pedagio', 'Transporte'], ['estacionamento', 'Transporte'],
  ['shell', 'Transporte'], ['ipiranga', 'Transporte'], ['petrobras', 'Transporte'],
  ['farmacia', 'Saúde'], ['drogaria', 'Saúde'], ['droga', 'Saúde'],
  ['medico', 'Saúde'], ['clinica', 'Saúde'], ['hospital', 'Saúde'],
  ['laboratorio', 'Saúde'], ['saude', 'Saúde'], ['dentist', 'Saúde'],
  ['netflix', 'Assinaturas'], ['spotify', 'Assinaturas'], ['amazon prime', 'Assinaturas'],
  ['disney', 'Assinaturas'], ['youtube', 'Assinaturas'], ['apple.com', 'Assinaturas'],
  ['google one', 'Assinaturas'], ['microsoft', 'Assinaturas'], ['hbo', 'Assinaturas'],
  ['curso', 'Educação'], ['faculdade', 'Educação'], ['escola', 'Educação'],
  ['universidade', 'Educação'], ['livro', 'Educação'], ['udemy', 'Educação'],
  ['telefone', 'Serviços'], ['internet', 'Serviços'], ['energia', 'Serviços'],
  ['celesc', 'Serviços'], ['copel', 'Serviços'], ['vivo', 'Serviços'],
  ['claro', 'Serviços'], ['tim', 'Serviços'], ['oi ', 'Serviços'],
  ['aluguel', 'Moradia'], ['condominio', 'Moradia'], ['iptu', 'Moradia'],
  ['darf', 'Impostos/Taxas'], ['tributo', 'Impostos/Taxas'], ['imposto', 'Impostos/Taxas'],
  ['anuidade', 'Impostos/Taxas'], ['oab', 'Impostos/Taxas'],
  ['cinema', 'Lazer'], ['teatro', 'Lazer'], ['show', 'Lazer'], ['ingresso', 'Lazer'],
  ['roupa', 'Vestuário'], ['calcado', 'Vestuário'], ['moda', 'Vestuário'],
  ['papelaria', 'Escritório'], ['escritorio', 'Escritório'],
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function categorize(descricao: string): string {
  const lower = descricao
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
  for (const [kw, cat] of KEYWORDS) {
    if (lower.includes(kw.replace(/[̀-ͯ]/g, '').toLowerCase())) return cat
  }
  return 'Outros'
}

function parseFatura(text: string): FaturaItem[] {
  const results: FaturaItem[] = []
  const lines = text.split('\n')
  // Matches: date (DD/MM or DD/MM/YY or DD/MM/YYYY) + description + BRL amount
  const re = /(\d{2}\/\d{2}(?:\/\d{2,4})?)\s+(.+?)\s+([\d.]+,\d{2})\s*(?:C|D|CR|DB)?\s*$/i

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    const m = line.match(re)
    if (!m) continue
    const [, data, descricao, valorStr] = m
    const valor = parseFloat(valorStr.replace(/\./g, '').replace(',', '.'))
    if (isNaN(valor) || valor <= 0) continue
    results.push({
      data,
      descricao: descricao.trim(),
      valor,
      categoria: categorize(descricao),
      selecionado: true,
    })
  }
  return results
}

function fmt(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function isOverdue(dateStr: string, status: string): boolean {
  if (status === 'recebido' || status === 'pago') return false
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return new Date(dateStr + 'T00:00:00') < today
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.ceil((new Date(dateStr + 'T00:00:00').getTime() - today.getTime()) / 86400000)
}

function addMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const totalMonths = m - 1 + months
  const year = y + Math.floor(totalMonths / 12)
  const month = totalMonths % 12
  const lastDay = new Date(year, month + 1, 0).getDate()
  const day = Math.min(d, lastDay)
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// ─── Field helper ─────────────────────────────────────────────────────────────

function Field({
  label, value, onChange, type = 'text', step, required, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; step?: string; required?: boolean; placeholder?: string
}) {
  return (
    <div>
      <label className="text-white/40 text-xs block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        step={step}
        required={required}
        placeholder={placeholder}
        className="w-full bg-dark-300 border border-white/10 rounded-sm px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold/50 placeholder-white/20"
      />
    </div>
  )
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ title, value, color, icon, subtitle }: {
  title: string; value: number; color: string; icon: React.ReactNode; subtitle?: string
}) {
  return (
    <div className="glass rounded-sm p-6 flex items-start gap-4">
      <div className="w-10 h-10 rounded-sm bg-gold/10 flex items-center justify-center flex-shrink-0 text-gold">
        {icon}
      </div>
      <div>
        <p className="text-white/40 text-xs uppercase tracking-widest mb-1">{title}</p>
        <p className={`text-2xl font-serif font-bold ${color}`}>{fmt(value)}</p>
        {subtitle && <p className="text-white/25 text-xs mt-1">{subtitle}</p>}
      </div>
    </div>
  )
}

// ─── Recebivel Modal ──────────────────────────────────────────────────────────

function RecebivelModal({
  initial, onSave, onClose, error,
}: {
  initial: Partial<Recebivel>
  onSave: (d: Partial<Recebivel>, repeticoes: number) => void
  onClose: () => void
  error?: string
}) {
  const [form, setForm] = useState({
    clienteName: initial.clienteName ?? '',
    processo: initial.processo ?? '',
    valor: initial.valor != null ? String(initial.valor) : '',
    dataVencimento: initial.dataVencimento ?? '',
    status: (initial.status ?? 'pendente') as 'pendente' | 'recebido',
    recorrente: initial.recorrente ?? false,
    observacoes: initial.observacoes ?? '',
  })
  const [repeticoes, setRepeticoes] = useState(2)

  const isNew = !initial.id
  const valorNum = parseFloat(form.valor.replace(',', '.'))
  const valorPorMes = !isNaN(valorNum) && repeticoes > 1 ? valorNum / repeticoes : valorNum

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isNaN(valorNum) || valorNum <= 0) return
    onSave({ ...initial, ...form, valor: valorNum }, form.recorrente && isNew ? repeticoes : 1)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-dark-200 border border-white/10 rounded-sm w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-serif text-white text-lg font-semibold">
            {initial.id ? 'Editar' : 'Novo'} Recebível
          </h3>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Cliente / Credor" value={form.clienteName} onChange={v => setForm(f => ({ ...f, clienteName: v }))} required placeholder="Nome do cliente" />
          <Field label="Nº Processo / Referência" value={form.processo} onChange={v => setForm(f => ({ ...f, processo: v }))} placeholder="Opcional" />
          <Field label="Valor total (R$)" value={form.valor} onChange={v => setForm(f => ({ ...f, valor: v }))} type="number" step="0.01" required placeholder="0,00" />
          <Field label="Data inicial de recebimento" value={form.dataVencimento} onChange={v => setForm(f => ({ ...f, dataVencimento: v }))} type="date" required />
          <div>
            <label className="text-white/40 text-xs block mb-1">Status</label>
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as 'pendente' | 'recebido' }))}
              className="w-full bg-dark-300 border border-white/10 rounded-sm px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold/50"
            >
              <option value="pendente">Pendente</option>
              <option value="recebido">Recebido</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.recorrente}
                onChange={e => setForm(f => ({ ...f, recorrente: e.target.checked }))}
                className="accent-gold"
              />
              <span className="text-white/50 text-sm">Parcelado / recorrente (mensal)</span>
            </label>
            {form.recorrente && isNew && (
              <div className="ml-6 space-y-1">
                <label className="text-white/40 text-xs block">Quantas vezes?</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={2}
                    max={60}
                    value={repeticoes}
                    onChange={e => setRepeticoes(Math.max(2, Math.min(60, Number(e.target.value))))}
                    className="w-20 bg-dark-300 border border-white/10 rounded-sm px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50"
                  />
                  <span className="text-white/30 text-xs">meses</span>
                </div>
                {form.dataVencimento && !isNaN(valorNum) && valorNum > 0 && (
                  <div className="p-2 bg-gold/5 border border-gold/20 rounded-sm space-y-0.5">
                    <p className="text-gold/70 text-xs">
                      {fmt(valorPorMes)}/mês · de {fmtDate(form.dataVencimento)} até {fmtDate(addMonths(form.dataVencimento, repeticoes - 1))}
                    </p>
                    <p className="text-white/30 text-xs">Total: {fmt(valorNum)}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <Field label="Observações" value={form.observacoes} onChange={v => setForm(f => ({ ...f, observacoes: v }))} placeholder="Opcional" />
          {error && <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-sm px-3 py-2">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-white/40 text-sm hover:text-white transition-colors">Cancelar</button>
            <button type="submit" className="px-5 py-2 bg-gold text-dark text-sm font-semibold rounded-sm hover:bg-gold-light transition-colors">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Pagamento Modal ──────────────────────────────────────────────────────────

function PagamentoModal({
  initial, onSave, onClose, error,
}: {
  initial: Partial<Pagamento>
  onSave: (d: Partial<Pagamento>, repeticoes: number) => void
  onClose: () => void
  error?: string
}) {
  const [form, setForm] = useState({
    descricao: initial.descricao ?? '',
    categoria: initial.categoria ?? 'Outros',
    valor: initial.valor != null ? String(initial.valor) : '',
    dataVencimento: initial.dataVencimento ?? '',
    status: (initial.status ?? 'pendente') as 'pendente' | 'pago',
    recorrente: initial.recorrente ?? false,
    origem: (initial.origem ?? 'manual') as 'manual' | 'fatura',
    observacoes: initial.observacoes ?? '',
  })
  const [repeticoes, setRepeticoes] = useState(2)

  const isNew = !initial.id
  const valorNum = parseFloat(form.valor.replace(',', '.'))
  const valorPorMes = !isNaN(valorNum) && repeticoes > 1 ? valorNum / repeticoes : valorNum

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isNaN(valorNum) || valorNum <= 0) return
    onSave({ ...initial, ...form, valor: valorNum }, form.recorrente && isNew ? repeticoes : 1)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-dark-200 border border-white/10 rounded-sm w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-serif text-white text-lg font-semibold">
            {initial.id ? 'Editar' : 'Novo'} Lançamento
          </h3>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Descrição" value={form.descricao} onChange={v => setForm(f => ({ ...f, descricao: v }))} required placeholder="Ex: Aluguel escritório" />
          <div>
            <label className="text-white/40 text-xs block mb-1">Categoria</label>
            <select
              value={form.categoria}
              onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
              className="w-full bg-dark-300 border border-white/10 rounded-sm px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold/50"
            >
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Field label="Valor total (R$)" value={form.valor} onChange={v => setForm(f => ({ ...f, valor: v }))} type="number" step="0.01" required placeholder="0,00" />
          <Field label="Data de Vencimento" value={form.dataVencimento} onChange={v => setForm(f => ({ ...f, dataVencimento: v }))} type="date" required />
          <div>
            <label className="text-white/40 text-xs block mb-1">Status</label>
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as 'pendente' | 'pago' }))}
              className="w-full bg-dark-300 border border-white/10 rounded-sm px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold/50"
            >
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.recorrente}
                onChange={e => setForm(f => ({ ...f, recorrente: e.target.checked }))}
                className="accent-gold"
              />
              <span className="text-white/50 text-sm">Conta recorrente (mensal)</span>
            </label>
            {form.recorrente && isNew && (
              <div className="ml-6 space-y-1">
                <label className="text-white/40 text-xs block">Quantas vezes?</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={2}
                    max={60}
                    value={repeticoes}
                    onChange={e => setRepeticoes(Math.max(2, Math.min(60, Number(e.target.value))))}
                    className="w-20 bg-dark-300 border border-white/10 rounded-sm px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50"
                  />
                  <span className="text-white/30 text-xs">meses</span>
                </div>
                {form.dataVencimento && !isNaN(valorNum) && valorNum > 0 && (
                  <div className="p-2 bg-gold/5 border border-gold/20 rounded-sm space-y-0.5">
                    <p className="text-gold/70 text-xs">
                      {fmt(valorPorMes)}/mês · de {fmtDate(form.dataVencimento)} até {fmtDate(addMonths(form.dataVencimento, repeticoes - 1))}
                    </p>
                    <p className="text-white/30 text-xs">Total: {fmt(valorNum)}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <Field label="Observações" value={form.observacoes} onChange={v => setForm(f => ({ ...f, observacoes: v }))} placeholder="Opcional" />
          {error && <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-sm px-3 py-2">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-white/40 text-sm hover:text-white transition-colors">Cancelar</button>
            <button type="submit" className="px-5 py-2 bg-gold text-dark text-sm font-semibold rounded-sm hover:bg-gold-light transition-colors">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Financeiro() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('dashboard')

  const [recebiveis, setRecebiveis] = useState<Recebivel[]>([])
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  const [editRecebivel, setEditRecebivel] = useState<Partial<Recebivel> | null>(null)
  const [editPagamento, setEditPagamento] = useState<Partial<Pagamento> | null>(null)

  // Fatura
  const [faturaText, setFaturaText] = useState('')
  const [faturaItems, setFaturaItems] = useState<FaturaItem[]>([])
  const [faturaVencimento, setFaturaVencimento] = useState('')
  const [showFaturaHelp, setShowFaturaHelp] = useState(false)

  // Filter
  const [filterPagar, setFilterPagar] = useState<'todos' | 'pendente' | 'pago'>('pendente')
  const [filterReceber, setFilterReceber] = useState<'todos' | 'pendente' | 'recebido'>('pendente')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u)
      setAuthLoading(false)
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) return
    setDataLoading(true)

    const q1 = query(collection(db, 'recebiveis'), orderBy('criadoEm', 'desc'))
    const unsub1 = onSnapshot(q1, snap => {
      setRecebiveis(snap.docs.map(d => ({ id: d.id, ...d.data() } as Recebivel)))
      setDataLoading(false)
    })

    const q2 = query(collection(db, 'pagamentos'), orderBy('criadoEm', 'desc'))
    const unsub2 = onSnapshot(q2, snap => {
      setPagamentos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Pagamento)))
    })

    return () => { unsub1(); unsub2() }
  }, [user])

  // ── CRUD: Recebiveis ──────────────────────────────────────────────────────

  const [saveError, setSaveError] = useState('')

  const saveRecebivel = async (data: Partial<Recebivel>, repeticoes = 1) => {
    setSaveError('')
    try {
      if (data.id) {
        const { id, ...rest } = data
        await updateDoc(doc(db, 'recebiveis', id), rest as Record<string, unknown>)
      } else if (repeticoes > 1 && data.dataVencimento) {
        const valorPorMes = (data.valor ?? 0) / repeticoes
        const grupoId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        await Promise.all(
          Array.from({ length: repeticoes }, (_, i) =>
            addDoc(collection(db, 'recebiveis'), {
              ...data,
              valor: valorPorMes,
              dataVencimento: addMonths(data.dataVencimento!, i),
              grupoRecorrencia: grupoId,
              criadoEm: Date.now() + i,
            })
          )
        )
      } else {
        await addDoc(collection(db, 'recebiveis'), { ...data, criadoEm: Date.now() })
      }
      setEditRecebivel(null)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setSaveError(`Erro ao salvar: ${msg}`)
    }
  }

  const deleteRecebivel = async (id: string) => {
    if (!confirm('Excluir este lançamento permanentemente?')) return
    try {
      await deleteDoc(doc(db, 'recebiveis', id))
    } catch (e: unknown) {
      alert(`Erro ao excluir: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const toggleRecebivel = async (r: Recebivel) => {
    try {
      await updateDoc(doc(db, 'recebiveis', r.id), {
        status: r.status === 'pendente' ? 'recebido' : 'pendente',
      })
    } catch (e: unknown) {
      alert(`Erro: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // ── CRUD: Pagamentos ──────────────────────────────────────────────────────

  const savePagamento = async (data: Partial<Pagamento>, repeticoes = 1) => {
    setSaveError('')
    try {
      if (data.id) {
        const { id, ...rest } = data
        await updateDoc(doc(db, 'pagamentos', id), rest as Record<string, unknown>)
      } else if (repeticoes > 1 && data.dataVencimento) {
        const valorPorMes = (data.valor ?? 0) / repeticoes
        const grupoId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        await Promise.all(
          Array.from({ length: repeticoes }, (_, i) =>
            addDoc(collection(db, 'pagamentos'), {
              ...data,
              valor: valorPorMes,
              dataVencimento: addMonths(data.dataVencimento!, i),
              grupoRecorrencia: grupoId,
              criadoEm: Date.now() + i,
            })
          )
        )
      } else {
        await addDoc(collection(db, 'pagamentos'), { ...data, criadoEm: Date.now() })
      }
      setEditPagamento(null)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setSaveError(`Erro ao salvar: ${msg}`)
    }
  }

  const deletePagamento = async (id: string) => {
    if (!confirm('Excluir este lançamento permanentemente?')) return
    try {
      await deleteDoc(doc(db, 'pagamentos', id))
    } catch (e: unknown) {
      alert(`Erro ao excluir: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const togglePagamento = async (p: Pagamento) => {
    try {
      await updateDoc(doc(db, 'pagamentos', p.id), {
        status: p.status === 'pendente' ? 'pago' : 'pendente',
      })
    } catch (e: unknown) {
      alert(`Erro: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // ── Fatura ────────────────────────────────────────────────────────────────

  const handleParseFatura = () => {
    const items = parseFatura(faturaText)
    if (items.length === 0) {
      alert('Nenhum lançamento identificado. Verifique o formato do texto colado.')
      return
    }
    setFaturaItems(items)
  }

  const toggleFaturaItem = (i: number) => {
    setFaturaItems(prev => prev.map((item, idx) =>
      idx === i ? { ...item, selecionado: !item.selecionado } : item
    ))
  }

  const updateFaturaCategoria = (i: number, categoria: string) => {
    setFaturaItems(prev => prev.map((item, idx) =>
      idx === i ? { ...item, categoria } : item
    ))
  }

  const addFaturaToPlanner = async () => {
    const selected = faturaItems.filter(i => i.selecionado)
    await Promise.all(selected.map(item =>
      addDoc(collection(db, 'pagamentos'), {
        descricao: item.descricao,
        categoria: item.categoria,
        valor: item.valor,
        dataVencimento: faturaVencimento,
        status: 'pendente',
        recorrente: false,
        origem: 'fatura',
        observacoes: `Data na fatura: ${item.data}`,
        criadoEm: Date.now(),
      })
    ))
    setFaturaItems([])
    setFaturaText('')
    setFaturaVencimento('')
    setTab('pagar')
    setFilterPagar('pendente')
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  const now = new Date()
  const currentMonth = now.getMonth()     // 0–11
  const currentYear = now.getFullYear()
  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const isThisMonth = (dateStr: string) => {
    if (!dateStr) return false
    const [y, m] = dateStr.split('-').map(Number)
    return y === currentYear && m === currentMonth + 1
  }

  const totalReceber = recebiveis
    .filter(r => r.status === 'pendente' && isThisMonth(r.dataVencimento))
    .reduce((s, r) => s + r.valor, 0)

  const totalPagar = pagamentos
    .filter(p => p.status === 'pendente' && isThisMonth(p.dataVencimento))
    .reduce((s, p) => s + p.valor, 0)

  const saldo = totalReceber - totalPagar

  const upcomingRecebiveis = recebiveis.filter(r => r.status === 'pendente' && daysUntil(r.dataVencimento) >= 0 && daysUntil(r.dataVencimento) <= 7)
  const upcomingPagamentos = pagamentos.filter(p => p.status === 'pendente' && daysUntil(p.dataVencimento) >= 0 && daysUntil(p.dataVencimento) <= 7)
  const overdueRecebiveis = recebiveis.filter(r => isOverdue(r.dataVencimento, r.status))
  const overduePagamentos = pagamentos.filter(p => isOverdue(p.dataVencimento, p.status))

  const filteredRecebiveis = filterReceber === 'todos' ? recebiveis : recebiveis.filter(r => r.status === filterReceber)
  const filteredPagamentos = filterPagar === 'todos' ? pagamentos : pagamentos.filter(p => p.status === filterPagar)

  const selectedFaturaTotal = faturaItems.filter(i => i.selecionado).reduce((s, i) => s + i.valor, 0)

  // Fluxo de caixa por mês (todos os períodos com lançamentos pendentes)
  const fluxoMensal = (() => {
    const map: Record<string, { receber: number; pagar: number }> = {}
    for (const r of recebiveis.filter(r => r.status === 'pendente' && r.dataVencimento)) {
      const key = r.dataVencimento.slice(0, 7)
      if (!map[key]) map[key] = { receber: 0, pagar: 0 }
      map[key].receber += r.valor
    }
    for (const p of pagamentos.filter(p => p.status === 'pendente' && p.dataVencimento)) {
      const key = p.dataVencimento.slice(0, 7)
      if (!map[key]) map[key] = { receber: 0, pagar: 0 }
      map[key].pagar += p.valor
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, vals]) => {
        const [y, m] = key.split('-').map(Number)
        const label = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        const isCurrent = y === currentYear && m === currentMonth + 1
        return { key, label, isCurrent, ...vals, saldo: vals.receber - vals.pagar }
      })
  })()

  // ── Auth screens ──────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center p-6">
        <div className="glass border border-white/10 rounded-sm p-10 w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-full border-2 border-gold flex items-center justify-center bg-gold/10 mx-auto mb-6">
            <DollarSign size={22} className="text-gold" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-white mb-2">Financeiro</h1>
          <p className="text-white/50 text-sm font-light mb-8">Entre com a conta autorizada para acessar.</p>
          <button
            onClick={() => signInWithPopup(auth, googleProvider).catch(console.error)}
            className="flex items-center gap-3 mx-auto px-6 py-3 bg-white text-gray-800 font-medium text-sm rounded-sm hover:bg-gray-100 transition-colors"
          >
            <GoogleIcon />
            Entrar com Google
          </button>
        </div>
      </div>
    )
  }

  if (!ADMIN_EMAILS.includes(user.email ?? '')) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center p-6">
        <div className="glass border border-red-500/20 rounded-sm p-10 w-full max-w-sm text-center">
          <p className="text-red-400 font-serif text-lg font-semibold mb-2">Acesso negado</p>
          <p className="text-white/50 text-sm font-light mb-6">Esta conta não tem permissão.</p>
          <button onClick={() => signOut(auth)} className="text-white/50 hover:text-white text-sm transition-colors">Sair</button>
        </div>
      </div>
    )
  }

  // ── Main UI ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-dark">
      {/* Header */}
      <header className="border-b border-gold/10 bg-dark-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full border-2 border-gold flex items-center justify-center bg-gold/10">
              <DollarSign size={16} className="text-gold" />
            </div>
            <div>
              <p className="font-serif font-semibold text-white text-sm">Financeiro</p>
              <p className="text-gold text-[10px] tracking-widest uppercase font-light">Gestão Financeira</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user.photoURL && (
              <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full opacity-60" />
            )}
            <button
              onClick={() => signOut(auth)}
              className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors"
            >
              <LogOut size={14} />
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-white/8 bg-dark-100">
        <div className="max-w-6xl mx-auto px-6 flex gap-0 overflow-x-auto">
          {([
            { key: 'dashboard', label: 'Painel', icon: LayoutDashboard },
            { key: 'receber', label: 'A Receber', icon: TrendingUp },
            { key: 'pagar', label: 'A Pagar', icon: TrendingDown },
            { key: 'fatura', label: 'Fatura', icon: CreditCard },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-4 text-xs font-medium tracking-wide uppercase border-b-2 transition-all duration-200 whitespace-nowrap ${
                tab === key
                  ? 'border-gold text-gold'
                  : 'border-transparent text-white/40 hover:text-white/70'
              }`}
            >
              <Icon size={13} />
              {label}
              {key === 'receber' && overdueRecebiveis.length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
              )}
              {key === 'pagar' && overduePagamentos.length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* ── DASHBOARD ─────────────────────────────────────────────────────── */}
        {tab === 'dashboard' && (
          <div className="space-y-8">
            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SummaryCard title="A Receber" value={totalReceber} color="text-green-400" icon={<TrendingUp size={18} />} subtitle={monthLabel} />
              <SummaryCard title="A Pagar" value={totalPagar} color="text-red-400" icon={<TrendingDown size={18} />} subtitle={monthLabel} />
              <SummaryCard
                title="Saldo do Mês"
                value={saldo}
                color={saldo >= 0 ? 'text-gold' : 'text-red-400'}
                icon={<DollarSign size={18} />}
                subtitle={monthLabel}
              />
            </div>

            {/* Overdue alert */}
            {(overdueRecebiveis.length > 0 || overduePagamentos.length > 0) && (
              <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-sm flex items-start gap-3">
                <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 text-sm font-medium">
                    {overdueRecebiveis.length + overduePagamentos.length} lançamento(s) em atraso
                  </p>
                  <p className="text-white/40 text-xs mt-0.5">
                    {overdueRecebiveis.length > 0 && `${overdueRecebiveis.length} a receber`}
                    {overdueRecebiveis.length > 0 && overduePagamentos.length > 0 && ' · '}
                    {overduePagamentos.length > 0 && `${overduePagamentos.length} a pagar`}
                  </p>
                </div>
              </div>
            )}

            {/* Upcoming 7 days */}
            <div>
              <h3 className="font-serif text-white text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar size={16} className="text-gold" />
                Próximos 7 dias
              </h3>
              {upcomingRecebiveis.length === 0 && upcomingPagamentos.length === 0 ? (
                <p className="text-white/25 text-sm italic">Nenhum vencimento nos próximos 7 dias.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {upcomingRecebiveis.map(r => (
                    <div key={r.id} className="flex items-center justify-between p-4 glass rounded-sm border-l-2 border-l-green-400 border-y border-r border-white/8">
                      <div>
                        <p className="text-white text-sm font-medium">{r.clienteName}</p>
                        <p className="text-white/35 text-xs mt-0.5">Receber em {fmtDate(r.dataVencimento)}</p>
                      </div>
                      <p className="text-green-400 text-sm font-semibold">{fmt(r.valor)}</p>
                    </div>
                  ))}
                  {upcomingPagamentos.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-4 glass rounded-sm border-l-2 border-l-red-400 border-y border-r border-white/8">
                      <div>
                        <p className="text-white text-sm font-medium">{p.descricao}</p>
                        <p className="text-white/35 text-xs mt-0.5">Pagar em {fmtDate(p.dataVencimento)} · {p.categoria}</p>
                      </div>
                      <p className="text-red-400 text-sm font-semibold">{fmt(p.valor)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Overdue detail */}
            {(overdueRecebiveis.length > 0 || overduePagamentos.length > 0) && (
              <div>
                <h3 className="font-serif text-white text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-400" />
                  Em Atraso
                </h3>
                <div className="flex flex-col gap-2">
                  {overdueRecebiveis.map(r => (
                    <div key={r.id} className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/20 rounded-sm">
                      <div>
                        <p className="text-white text-sm font-medium">{r.clienteName}</p>
                        <p className="text-red-400/60 text-xs mt-0.5">Venceu em {fmtDate(r.dataVencimento)} — a receber</p>
                      </div>
                      <p className="text-red-400 text-sm font-semibold">{fmt(r.valor)}</p>
                    </div>
                  ))}
                  {overduePagamentos.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/20 rounded-sm">
                      <div>
                        <p className="text-white text-sm font-medium">{p.descricao}</p>
                        <p className="text-red-400/60 text-xs mt-0.5">Venceu em {fmtDate(p.dataVencimento)} — a pagar</p>
                      </div>
                      <p className="text-red-400 text-sm font-semibold">{fmt(p.valor)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fluxo de Caixa mensal */}
            {fluxoMensal.length > 0 && (
              <div>
                <h3 className="font-serif text-white text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp size={16} className="text-gold" />
                  Fluxo de Caixa
                </h3>

                {/* Header */}
                <div className="grid grid-cols-4 gap-2 px-4 mb-2">
                  <span className="text-white/25 text-xs uppercase tracking-wide">Mês</span>
                  <span className="text-white/25 text-xs uppercase tracking-wide text-right">A Receber</span>
                  <span className="text-white/25 text-xs uppercase tracking-wide text-right">A Pagar</span>
                  <span className="text-white/25 text-xs uppercase tracking-wide text-right">Saldo</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  {fluxoMensal.map(mes => (
                    <div
                      key={mes.key}
                      className={`grid grid-cols-4 gap-2 items-center px-4 py-3 rounded-sm border transition-all ${
                        mes.isCurrent
                          ? 'border-gold/30 bg-gold/5'
                          : 'border-white/6 bg-dark-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {mes.isCurrent && (
                          <span className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />
                        )}
                        <span className={`text-sm capitalize truncate ${mes.isCurrent ? 'text-gold font-medium' : 'text-white/60'}`}>
                          {mes.label}
                        </span>
                      </div>
                      <span className={`text-sm text-right font-medium ${mes.receber > 0 ? 'text-green-400' : 'text-white/20'}`}>
                        {mes.receber > 0 ? fmt(mes.receber) : '—'}
                      </span>
                      <span className={`text-sm text-right font-medium ${mes.pagar > 0 ? 'text-red-400' : 'text-white/20'}`}>
                        {mes.pagar > 0 ? fmt(mes.pagar) : '—'}
                      </span>
                      <span className={`text-sm text-right font-semibold ${
                        mes.saldo > 0 ? 'text-green-400' : mes.saldo < 0 ? 'text-red-400' : 'text-white/30'
                      }`}>
                        {mes.saldo > 0 ? '+' : ''}{fmt(mes.saldo)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Totais gerais */}
                {fluxoMensal.length > 1 && (() => {
                  const totalR = fluxoMensal.reduce((s, m) => s + m.receber, 0)
                  const totalP = fluxoMensal.reduce((s, m) => s + m.pagar, 0)
                  const totalS = totalR - totalP
                  return (
                    <div className="grid grid-cols-4 gap-2 items-center px-4 py-3 mt-1 border-t border-white/10">
                      <span className="text-white/40 text-xs font-medium uppercase tracking-wide">Total geral</span>
                      <span className="text-green-400/70 text-sm text-right font-semibold">{fmt(totalR)}</span>
                      <span className="text-red-400/70 text-sm text-right font-semibold">{fmt(totalP)}</span>
                      <span className={`text-sm text-right font-bold ${totalS >= 0 ? 'text-gold' : 'text-red-400'}`}>
                        {totalS > 0 ? '+' : ''}{fmt(totalS)}
                      </span>
                    </div>
                  )
                })()}
              </div>
            )}

            {dataLoading && (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
              </div>
            )}
          </div>
        )}

        {/* ── A RECEBER ─────────────────────────────────────────────────────── */}
        {tab === 'receber' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-serif text-2xl font-bold text-white">A Receber</h2>
                <p className="text-white/40 text-sm mt-1">
                  {recebiveis.filter(r => r.status === 'pendente').length} pendente(s) · {fmt(totalReceber)}
                </p>
              </div>
              <button
                onClick={() => setEditRecebivel({})}
                className="flex items-center gap-2 px-4 py-2.5 bg-gold text-dark text-sm font-semibold rounded-sm hover:bg-gold-light transition-colors"
              >
                <Plus size={14} />
                Novo
              </button>
            </div>

            {/* Filter */}
            <div className="flex gap-2 mb-5">
              {(['pendente', 'todos', 'recebido'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterReceber(f)}
                  className={`px-3 py-1.5 text-xs font-medium tracking-wide rounded-sm border transition-all duration-200 ${
                    filterReceber === f
                      ? 'bg-gold text-dark border-gold'
                      : 'border-white/10 text-white/40 hover:text-white'
                  }`}
                >
                  {f === 'todos' ? 'Todos' : f === 'pendente' ? 'Pendentes' : 'Recebidos'}
                </button>
              ))}
            </div>

            {filteredRecebiveis.length === 0 ? (
              <div className="text-center py-16 text-white/20 text-sm italic">Nenhum lançamento encontrado.</div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredRecebiveis.map(r => (
                  <div
                    key={r.id}
                    className={`flex items-center gap-4 p-5 rounded-sm border transition-all ${
                      r.status === 'recebido'
                        ? 'border-white/5 bg-dark-100 opacity-55'
                        : isOverdue(r.dataVencimento, r.status)
                        ? 'border-red-500/30 bg-red-500/5'
                        : 'border-white/8 bg-dark-100 hover:border-white/15'
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleRecebivel(r)}
                      title={r.status === 'pendente' ? 'Marcar como recebido' : 'Marcar como pendente'}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        r.status === 'recebido'
                          ? 'bg-green-500 border-green-500'
                          : 'border-white/30 hover:border-green-400'
                      }`}
                    >
                      {r.status === 'recebido' && <Check size={10} className="text-white" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-medium ${r.status === 'recebido' ? 'line-through text-white/35' : 'text-white'}`}>
                          {r.clienteName}
                        </p>
                        {r.processo && <span className="text-white/25 text-xs">· {r.processo}</span>}
                        {isOverdue(r.dataVencimento, r.status) && (
                          <span className="text-red-400 text-[10px] font-medium px-1.5 py-0.5 bg-red-400/10 rounded-sm">VENCIDO</span>
                        )}
                      </div>
                      {r.observacoes && (
                        <p className="text-white/30 text-xs mt-0.5 truncate">{r.observacoes}</p>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-semibold ${r.status === 'recebido' ? 'text-white/25' : 'text-green-400'}`}>
                        {fmt(r.valor)}
                      </p>
                      <p className="text-white/25 text-xs mt-0.5">{fmtDate(r.dataVencimento)}</p>
                    </div>

                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => setEditRecebivel(r)}
                        className="p-2 text-white/20 hover:text-white transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => deleteRecebivel(r.id)}
                        className="p-2 text-white/20 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── A PAGAR ───────────────────────────────────────────────────────── */}
        {tab === 'pagar' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-serif text-2xl font-bold text-white">A Pagar</h2>
                <p className="text-white/40 text-sm mt-1">
                  {pagamentos.filter(p => p.status === 'pendente').length} pendente(s) · {fmt(totalPagar)}
                </p>
              </div>
              <button
                onClick={() => setEditPagamento({ categoria: 'Outros', recorrente: false, origem: 'manual' })}
                className="flex items-center gap-2 px-4 py-2.5 bg-gold text-dark text-sm font-semibold rounded-sm hover:bg-gold-light transition-colors"
              >
                <Plus size={14} />
                Novo
              </button>
            </div>

            {/* Filter */}
            <div className="flex gap-2 mb-5">
              {(['pendente', 'todos', 'pago'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterPagar(f)}
                  className={`px-3 py-1.5 text-xs font-medium tracking-wide rounded-sm border transition-all duration-200 ${
                    filterPagar === f
                      ? 'bg-gold text-dark border-gold'
                      : 'border-white/10 text-white/40 hover:text-white'
                  }`}
                >
                  {f === 'todos' ? 'Todos' : f === 'pendente' ? 'Pendentes' : 'Pagos'}
                </button>
              ))}
            </div>

            {filteredPagamentos.length === 0 ? (
              <div className="text-center py-16 text-white/20 text-sm italic">Nenhum lançamento encontrado.</div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredPagamentos.map(p => (
                  <div
                    key={p.id}
                    className={`flex items-center gap-4 p-5 rounded-sm border transition-all ${
                      p.status === 'pago'
                        ? 'border-white/5 bg-dark-100 opacity-55'
                        : isOverdue(p.dataVencimento, p.status)
                        ? 'border-red-500/30 bg-red-500/5'
                        : 'border-white/8 bg-dark-100 hover:border-white/15'
                    }`}
                  >
                    <button
                      onClick={() => togglePagamento(p)}
                      title={p.status === 'pendente' ? 'Marcar como pago' : 'Marcar como pendente'}
                      className={`w-5 h-5 rounded-sm border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        p.status === 'pago'
                          ? 'bg-gold border-gold'
                          : 'border-white/30 hover:border-gold'
                      }`}
                    >
                      {p.status === 'pago' && <Check size={10} className="text-dark" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-medium ${p.status === 'pago' ? 'line-through text-white/35' : 'text-white'}`}>
                          {p.descricao}
                        </p>
                        <span className="text-[10px] px-1.5 py-0.5 bg-gold/10 text-gold/70 rounded-sm">{p.categoria}</span>
                        {p.recorrente && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-400/10 text-blue-400/70 rounded-sm">Recorrente</span>
                        )}
                        {p.origem === 'fatura' && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-white/5 text-white/25 rounded-sm">Fatura</span>
                        )}
                        {isOverdue(p.dataVencimento, p.status) && (
                          <span className="text-red-400 text-[10px] font-medium px-1.5 py-0.5 bg-red-400/10 rounded-sm">VENCIDO</span>
                        )}
                      </div>
                      {p.observacoes && (
                        <p className="text-white/30 text-xs mt-0.5 truncate">{p.observacoes}</p>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-semibold ${p.status === 'pago' ? 'text-white/25' : 'text-red-400'}`}>
                        {fmt(p.valor)}
                      </p>
                      <p className="text-white/25 text-xs mt-0.5">{fmtDate(p.dataVencimento)}</p>
                    </div>

                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => setEditPagamento(p)}
                        className="p-2 text-white/20 hover:text-white transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => deletePagamento(p.id)}
                        className="p-2 text-white/20 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── FATURA ────────────────────────────────────────────────────────── */}
        {tab === 'fatura' && (
          <div className="max-w-3xl">
            <div className="mb-6">
              <h2 className="font-serif text-2xl font-bold text-white">Analisar Fatura</h2>
              <p className="text-white/40 text-sm mt-1">
                Cole o texto da fatura do cartão — o sistema identifica data, descrição e valor de cada lançamento.
              </p>
            </div>

            {faturaItems.length === 0 ? (
              <div className="space-y-4">
                <textarea
                  value={faturaText}
                  onChange={e => setFaturaText(e.target.value)}
                  placeholder="Cole aqui o texto da fatura..."
                  rows={12}
                  className="w-full bg-dark-200 border border-white/10 rounded-sm px-4 py-3 text-white/80 text-sm font-mono placeholder-white/20 resize-y focus:outline-none focus:border-gold/50"
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleParseFatura}
                    disabled={!faturaText.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gold text-dark text-sm font-semibold rounded-sm hover:bg-gold-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <FileText size={14} />
                    Identificar Lançamentos
                  </button>
                </div>

                {/* Help toggle */}
                <button
                  onClick={() => setShowFaturaHelp(v => !v)}
                  className="flex items-center gap-1.5 text-white/30 hover:text-white/60 text-xs transition-colors"
                >
                  <ChevronDown size={12} className={`transition-transform ${showFaturaHelp ? 'rotate-180' : ''}`} />
                  Como funciona?
                </button>
                {showFaturaHelp && (
                  <div className="p-4 bg-dark-200 border border-white/8 rounded-sm text-white/40 text-xs leading-relaxed space-y-2">
                    <p><strong className="text-white/60">1.</strong> Abra o PDF da sua fatura no navegador.</p>
                    <p><strong className="text-white/60">2.</strong> Selecione todo o texto (Ctrl+A) e copie (Ctrl+C).</p>
                    <p><strong className="text-white/60">3.</strong> Cole aqui e clique em "Identificar Lançamentos".</p>
                    <p className="pt-1 border-t border-white/8">
                      O sistema detecta linhas no padrão{' '}
                      <code className="bg-white/5 px-1 rounded">DD/MM DESCRIÇÃO 1.234,56</code>.
                      Funciona com Nubank, Itaú, Bradesco, Santander e a maioria dos bancos brasileiros.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                {/* Controls */}
                <div className="flex items-center justify-between">
                  <p className="text-white/50 text-sm">
                    <span className="text-white font-medium">{faturaItems.filter(i => i.selecionado).length}</span>
                    {' '}de {faturaItems.length} lançamentos selecionados
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setFaturaItems(prev => prev.map(i => ({ ...i, selecionado: true })))}
                      className="text-white/30 hover:text-gold text-xs transition-colors"
                    >
                      Selecionar todos
                    </button>
                    <span className="text-white/15">·</span>
                    <button
                      onClick={() => { setFaturaItems([]); setFaturaText('') }}
                      className="text-white/30 hover:text-white text-xs transition-colors"
                    >
                      Recomeçar
                    </button>
                  </div>
                </div>

                {/* Vencimento */}
                <div className="flex items-center gap-3 p-4 bg-dark-200 border border-white/8 rounded-sm">
                  <Calendar size={14} className="text-gold flex-shrink-0" />
                  <label className="text-white/50 text-sm flex-shrink-0">Vencimento da fatura:</label>
                  <input
                    type="date"
                    value={faturaVencimento}
                    onChange={e => setFaturaVencimento(e.target.value)}
                    className="bg-dark-300 border border-white/10 rounded-sm px-3 py-1.5 text-white text-sm focus:outline-none focus:border-gold/50"
                  />
                </div>

                {/* Items */}
                <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto pr-1">
                  {faturaItems.map((item, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 p-3.5 rounded-sm border cursor-pointer transition-all select-none ${
                        item.selecionado
                          ? 'border-gold/25 bg-gold/4'
                          : 'border-white/5 bg-dark-100 opacity-40'
                      }`}
                    >
                      {/* Checkbox */}
                      <div
                        onClick={() => toggleFaturaItem(i)}
                        className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          item.selecionado ? 'bg-gold border-gold' : 'border-white/20'
                        }`}
                      >
                        {item.selecionado && <Check size={9} className="text-dark" />}
                      </div>

                      <span
                        onClick={() => toggleFaturaItem(i)}
                        className="text-white/35 text-xs w-14 flex-shrink-0 font-mono"
                      >
                        {item.data}
                      </span>

                      <p
                        onClick={() => toggleFaturaItem(i)}
                        className="text-white/80 text-sm flex-1 truncate"
                      >
                        {item.descricao}
                      </p>

                      {/* Categoria editável */}
                      <select
                        value={item.categoria}
                        onChange={e => updateFaturaCategoria(i, e.target.value)}
                        onClick={e => e.stopPropagation()}
                        className="bg-dark-300 border border-white/8 rounded-sm px-2 py-1 text-[10px] text-gold/80 focus:outline-none focus:border-gold/40 flex-shrink-0"
                      >
                        {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>

                      <p
                        onClick={() => toggleFaturaItem(i)}
                        className="text-white text-sm font-medium flex-shrink-0 w-24 text-right"
                      >
                        {fmt(item.valor)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Total + action */}
                <div className="flex items-center justify-between p-4 bg-dark-200 border border-white/8 rounded-sm">
                  <span className="text-white/50 text-sm">Total selecionado</span>
                  <span className="text-gold font-serif font-bold text-lg">{fmt(selectedFaturaTotal)}</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={addFaturaToPlanner}
                    disabled={faturaItems.filter(i => i.selecionado).length === 0 || !faturaVencimento}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gold text-dark text-sm font-semibold rounded-sm hover:bg-gold-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus size={14} />
                    Adicionar a A Pagar
                  </button>
                  {!faturaVencimento && (
                    <p className="text-yellow-500/70 text-xs">Informe o vencimento acima.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {editRecebivel !== null && (
        <RecebivelModal
          initial={editRecebivel}
          onSave={(d, rep) => saveRecebivel(d, rep)}
          onClose={() => { setEditRecebivel(null); setSaveError('') }}
          error={saveError}
        />
      )}
      {editPagamento !== null && (
        <PagamentoModal
          initial={editPagamento}
          onSave={savePagamento}
          onClose={() => { setEditPagamento(null); setSaveError('') }}
          error={saveError}
        />
      )}
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}
