import { useAppState } from './context.jsx'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import SetupScreen from './components/SetupScreen.jsx'
import ColorsScreen from './components/ColorsScreen.jsx'
import PickingScreen from './components/PickingScreen.jsx'
import SetScreen from './components/SetScreen.jsx'
import SummaryScreen from './components/SummaryScreen.jsx'
import './App.css'

function App() {
  const { state } = useAppState()

  return (
    <>
      <Header />
      <main className="app-main">
        {state.screen === 'setup' && <SetupScreen />}
        {state.screen === 'colors' && <ColorsScreen />}
        {state.screen === 'picking' && <PickingScreen />}
        {state.screen === 'set' && <SetScreen />}
        {state.screen === 'summary' && <SummaryScreen />}
      </main>
      <Footer />
    </>
  )
}

export default App
