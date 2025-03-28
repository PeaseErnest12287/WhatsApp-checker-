import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [contacts, setContacts] = useState([]);
  const [validContacts, setValidContacts] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentNumber, setCurrentNumber] = useState('');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [typedNumber, setTypedNumber] = useState('');
  const fileInputRef = useRef();

  useEffect(() => {
    if (!currentNumber || !isProcessing) return;

    let i = 0;
    const typing = setInterval(() => {
      setTypedNumber(currentNumber.substring(0, i));
      i++;
      if (i > currentNumber.length) clearInterval(typing);
    }, 100);

    return () => clearInterval(typing);
  }, [currentNumber, isProcessing]);

  const handleVcfUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatusMessage("Reading VCF file...");
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const contacts = parseVcf(event.target.result);
        setContacts(contacts);
        setStatusMessage(`Found ${contacts.length} contacts in VCF`);
      } catch (error) {
        setStatusMessage("Error: Invalid VCF file format");
        console.error(error);
      }
    };
    reader.readAsText(file);
  };

  const parseVcf = (vcfContent) => {
    return vcfContent
      .split('BEGIN:VCARD')
      .filter(card => card.includes('TEL:'))
      .map(card => {
        const name = card.match(/FN:(.*?)(\n|$)/)?.[1]?.trim() || 'Unknown';
        const number = card.match(/TEL:(.*?)(\n|$)/)?.[1]?.replace(/\D/g, '') || '';
        return { name, number: number ? `+${number}` : '' };
      })
      .filter(c => c.number);
  };

  const startGhostScan = async () => {
    if (!contacts.length) return;

    setIsProcessing(true);
    setValidContacts([]);
    setStatusMessage(`Starting scan of ${contacts.length} contacts...`);

    const valid = [];

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      setCurrentNumber(contact.number);
      setProgress(Math.round((i + 1) / contacts.length * 100));
      setStatusMessage(`Checking ${i + 1}/${contacts.length}: ${contact.number}`);

      try {
        const response = await axios.post(
          'https://number-cheker-api.onrender.com/ghost-check',
          { number: contact.number },
          { headers: { 'Content-Type': 'application/json' } }
        );

        if (response.data.is_valid) {
          valid.push(contact);
          setStatusMessage(`✅ Valid WhatsApp found! (${valid.length} so far)`);
        } else {
          setStatusMessage(`❌ Not on WhatsApp (${i + 1}/${contacts.length})`);
        }
      } catch (error) {
        setStatusMessage(`⚠️ Error checking ${contact.number}`);
      }

      await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
    }

    setValidContacts(valid);
    setIsProcessing(false);
    setStatusMessage(`Scan complete! Found ${valid.length} valid WhatsApp contacts`);
  };

  const exportValidContacts = () => {
    if (!validContacts.length) return;

    let vcfContent = validContacts.map(contact =>
      `BEGIN:VCARD\nVERSION:3.0\nFN:${contact.name}\nTEL:${contact.number}\nEND:VCARD`
    ).join('\n');

    const blob = new Blob([vcfContent], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whatsapp_contacts_${new Date().toISOString().split('T')[0]}.vcf`;
    a.click();
    setStatusMessage(`Exported ${validContacts.length} contacts to VCF`);
  };

  return (
    <div className="app">
      <h1>WHATSAPP VCF GHOST SCANNER</h1>
      <div className="upload-section">
        <input type="file" ref={fileInputRef} onChange={handleVcfUpload} accept=".vcf,.vcard" style={{ display: 'none' }} />
        <button onClick={() => fileInputRef.current.click()}>Upload VCF File</button>
        <p>Supports standard vCard files</p>
      </div>
      {statusMessage && <div className="status-message">{statusMessage}</div>}
      {validContacts.length > 0 && (
        <div className="results-section">
          <h2>WhatsApp Contacts Found: <span className="valid-count">{validContacts.length}</span></h2>
          <button onClick={exportValidContacts} className="export-btn">Export WhatsApp Contacts</button>
        </div>
      )}
      <div className="branding">
        <div className="logo">ERNEST TECH HOUSE</div>
        <div className="programmer">Programmed by Peace Ernest</div>
        <div className="social-links">
          <a href="https://whatsapp.com/channel/0029VayK4ty7DAWr0jeCZx0i" className="social-link" target="_blank" rel="noopener noreferrer">WhatsApp Channel</a>
          <a href="https://chat.whatsapp.com/FAJjIZY3a09Ck73ydqMs4E" className="social-link" target="_blank" rel="noopener noreferrer">WhatsApp Group</a>
        </div>
      </div>
    </div>
  );
}

export default App;
