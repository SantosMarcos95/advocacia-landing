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

export default function App() {
  const [page, setPage] = useState<'home' | 'admin'>('home')

  useEffect(() => {
    if (window.location.pathname === '/admin') {
      setPage('admin')
    }
  }, [])

  if (page === 'admin') {
    return <Admin />
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
