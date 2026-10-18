import {Navigate,Route,Routes} from 'react-router-dom';
import {AnswerPage} from './routes/AnswerPage';
import {ConsultationDashboard} from './routes/ConsultationDashboard';

export function App(){
  return <Routes>
    <Route path="/answer" element={<AnswerPage/>}/>
    <Route path="/consultation/user" element={<ConsultationDashboard key="user" side="user"/>}/>
    <Route path="/consultation/admin" element={<ConsultationDashboard key="admin" side="admin"/>}/>
    <Route path="/consultation" element={<Navigate to="/consultation/user" replace/>}/>
    <Route path="*" element={<Navigate to="/consultation" replace/>}/>
  </Routes>
}
