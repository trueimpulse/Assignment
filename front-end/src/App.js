import { useEffect, useState } from 'react';
import Contacts from './components/Contacts';
import { Toaster } from 'react-hot-toast';
import './App.css';

function App() {
  const [auth, setAuth] = useState(false);
  const [oAuthUrl, setOAuthUrl] = useState('');

  useEffect(() => {
    getAuth()
    getAuthUrl()
  }, []);

  const getAuth = async () => {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/hubspot/authorization`).then((res) => res.json()).catch((err) => console.log(err));

    if (response?.status === 200) {
      setAuth(response?.auth_status);
    }
  }

  const getAuthUrl = async () => {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/hubspot/auth-url`).then((res) => res.json()).catch((err) => console.log(err));

    if (response?.status === 200) {
      setOAuthUrl(response?.authUrl);
    }
  }

  const disconnect = async () => {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/hubspot/disconnect`).then((res) => res.json()).catch((err) => console.log(err));

    if (response?.status === 200) {
      getAuth()
    }
  }


  return (
    <div>
      <h1 className='title'>HubSpot Hub</h1>
      <div className='container'>
        <div className='auth-card'>
          <h2>
            <span>HubSpot OAuth </span>
            <span className={`${auth ? 'connected' : 'not_connected'}`}>{auth ? 'Connected' : 'Not-Connected'}</span>
          </h2>
          {auth ?
            <button className='btn disconnect' onClick={disconnect}>Disconnect Hubspot</button>
            :
            <a href={oAuthUrl} className='btn'>Connect Hubspot</a>
          }
        </div>
        {auth && <Contacts />}
      </div>
      <Toaster
        position="bottom-center"
        reverseOrder={false}
      />
    </div>
  );
}

export default App;
