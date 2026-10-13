import {Navigate,Route,Routes} from 'react-router-dom';
import {AnswerPage} from './routes/AnswerPage';
import {ConsultationDashboard} from './routes/ConsultationDashboard';

export function App(){
  return <Routes>
    <Route path="/answer" element={<AnswerPage/>}/>
    <Route path="/consultation" element={<ConsultationDashboard/>}/>
    <Route path="*" element={<Navigate to="/consultation" replace/>}/>
  </Routes>
}
