import Navbar from './components/Navbar'
import Hero from './components/Hero'
import About from './components/About'
import PracticeAreas from './components/PracticeAreas'
import Contact from './components/Contact'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="min-h-screen bg-dark overflow-x-hidden">
      <Navbar />
      <Hero />
      <About />
      <PracticeAreas />
      <Contact />
      <Footer />
    </div>
  )
}
