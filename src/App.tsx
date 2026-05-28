import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import Loading from './pages/Loading';
import Loading2 from './pages/Loading2';

const MikuraIntro = lazy(() => import('./pages/MikuraIntro'))
const Guide = lazy(() => import('./pages/MikuraGuide'))
const PhotoBook = lazy(() => import('./pages/PhotoBook'))
const Camera = lazy(() => import('./pages/Camera'))
const SelectPhoto = lazy(() => import('./pages/SelectPhoto'))
const DecoPhoto = lazy(() => import('./pages/DecoPhoto'))

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<MikuraIntro />} />
        <Route path="/guide" element={<Guide />} />
        <Route path="/photobook" element={<PhotoBook />} />
        <Route path="/camera" element={<Camera />} />
        <Route path="/loading2" element = {<Loading2/>}/>
        <Route path="/selectphoto" element = {<SelectPhoto/>} />
        <Route path="/decophoto" element = {<DecoPhoto/>} />
      </Routes>
    </Suspense>
  )
}

export default App
