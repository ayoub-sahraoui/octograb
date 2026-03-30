import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Blueprints from './blueprints'
import Settings from './settings'
import ExtractedData from './extracted-data'
import Home from './home'
import BlueprintBuilder from './blueprint-builder'
import Layout from './layout'
import AiChat from './ai-chat'
import MacroLibrary from './macro-library'

export default function Router() {
    return (
        <MemoryRouter initialEntries={['/']} initialIndex={0}>
            <Routes>
                <Route path='/' Component={Layout}>
                    <Route index Component={Home} />
                    <Route path='/blueprint-builder' Component={BlueprintBuilder} />
                    <Route path='/blueprints' Component={Blueprints} />
                    <Route path='/extracted-data' Component={ExtractedData} />
                    <Route path='/ai-chat' Component={AiChat} />
                    <Route path='/macros' Component={MacroLibrary} />
                    <Route path='/settings' Component={Settings} />
                </Route>
            </Routes>
        </MemoryRouter>
    )
}
