import { useEffect, useState } from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import About from './components/About'
import PracticeAreas from './components/PracticeAreas'
import Testimonials from './components/Testimonials'
import FAQ from './components/FAQ'
import Contact from './components/Contact'
import Footer from './components/Footer'
import Admin from './pages/Admin'
import Farm3D from './pages/Farm3D'

export default function App() {
  const [page, setPage] = useState<'home' | 'admin' | 'farm3d'>('home')

  useEffect(() => {
    if (window.location.pathname === '/admin') {
      setPage('admin')
    } else if (window.location.pathname === '/farm3d') {
      setPage('farm3d')
    }
  }, [])

  if (page === 'admin') {
    return <Admin />
  }

  if (page === 'farm3d') {
    return <Farm3D />
  }

  return (
    <div className="min-h-screen bg-dark overflow-x-hidden">
      <Navbar />
      <Hero />
      <About />
      <PracticeAreas />
      <Testimonials />
      <FAQ />
      <Contact />
      <Footer />
    </div>
  )
}
