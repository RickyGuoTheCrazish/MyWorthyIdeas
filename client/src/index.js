import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import WelcomePage from "./pages/WelcomePage";

import './index.css';

const App = () => {
  // useEffect(() => {
  //   if (window.location.protocol !== 'https:') {
  //     window.location.href = window.location.href.replace('http', 'https');
  //   }
  // }, []);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route index element={<WelcomePage />} />
          {/* <Route path='/InputPad' element={<InputPad />} /> */}
        </Routes>
      </div>
    </Router>
  );
};

const styleLink = document.createElement("link");
styleLink.rel = "stylesheet";
styleLink.href = "https://cdn.jsdelivr.net/npm/semantic-ui/dist/semantic.min.css";

document.head.appendChild(styleLink);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(

    <App />

);
