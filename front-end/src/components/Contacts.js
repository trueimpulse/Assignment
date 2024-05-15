import { useEffect, useState } from "react";
import toast from "react-hot-toast";


function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    getContacts();
  }, []);

  const getContacts = async () => {
    setLoading(true);
    const response = await fetch(`${process.env.REACT_APP_API_URL}/contacts/all`).then((res) => res.json()).catch((err) => console.log(err)).finally(() => setLoading(false));

    if (response?.status === 200) {
      setContacts(response?.contacts);
    }
  }

  const addContact = async (e) => {
    e.preventDefault();
    setLoading(true);
    const response = await fetch(`${process.env.REACT_APP_API_URL}/contacts/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        firstName,
        lastName,
        email
      })
    }).then((res) => res.json()).catch((err) => console.log(err)).finally(() => setLoading(false));

    if (response?.status === 200) {
      setForm(false);
      getContacts();
      toast.success('Contact added successfully');
    }else{
      toast.error(response?.message || 'Something went wrong');
    }
  }

  const syncWithHubSpot = async () => {
    setLoading(true);
    const response = await fetch(`${process.env.REACT_APP_API_URL}/hubspot/sync-contacts`).then((res) => res.json()).catch((err) => console.log(err));

    if (response?.status === 200) {
      getContacts();
      toast.success(response?.message);
    }else{
      toast.error(response?.message || 'Something went wrong');
    }
  }


  return (
    <div className="contacts">
      {form ? (
        <div className="add">
          <h2>Add new contact</h2>
          <form className="form" onSubmit={addContact}>
            <input
              type="text" placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <input
              type="text" placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
            <input
              type="email" placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button className="btn">
              {loading ? 'Adding...' : 'Add'}
            </button>
          </form>
        </div>
      ) : (
        <div className="contacts_list">
          <div className="flex items-center justify-between">
            <h2>Contacts ({contacts?.length || 0})</h2>
            <div className="buttons">
              <button className="" onClick={syncWithHubSpot}>
                Sync with HubSpot
              </button>
              <button className="" onClick={() => {
                setForm(true)
              }}>Add new</button>
            </div>
          </div>
          {loading && <p className="loading">Loading...</p>}
          <div className="contacts-container">
            {contacts.map(contact =>
              <div key={contact.id} className="contact-box">
                <b> {contact.firstName} {contact.lastName}</b>
                <p>{contact.email}</p>
                <p>HubSpot ID: {contact.hsId}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>

  );
}

export default Contacts;
