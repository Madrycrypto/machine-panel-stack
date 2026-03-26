import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Settings,
  Search,
  Filter,
  ArrowRight,
  ClipboardList,
  Upload,
  X,
  Camera,
  History,
  Image as ImageIcon
} from 'lucide-react';
import { addDays, differenceInDays, format, parseISO } from 'date-fns';

// --- Helper do generowania dynamicznych testowych dat ---
const today = new Date();
const formatDate = (date) => format(date, 'yyyy-MM-dd');

const initialMachines = [
  { id: 'M-101', name: 'Prasa Krawędziowa CNC 1', lastInspection: formatDate(addDays(today, -15)), cycleDays: 30, department: 'Obróbka blach' },
  { id: 'M-102', name: 'Laser Fiber 4kW', lastInspection: formatDate(addDays(today, -58)), cycleDays: 60, department: 'Cięcie' },
  { id: 'M-205', name: 'Wtryskarka 150T', lastInspection: formatDate(addDays(today, -95)), cycleDays: 90, department: 'Wtryskownia' },
  { id: 'M-301', name: 'Zrobotyzowane gniazdo spawania', lastInspection: formatDate(addDays(today, -2)), cycleDays: 14, department: 'Spawalnia' },
  { id: 'M-103', name: 'Prasa Mimośrodowa 63T', lastInspection: formatDate(addDays(today, -35)), cycleDays: 30, department: 'Tłocznia' },
];

function calculateStatus(lastInspectionDateStr, cycleDays) {
  if (!lastInspectionDateStr) return 'danger';
  const lastInspectionDate = parseISO(lastInspectionDateStr);
  const nextInspectionDate = addDays(lastInspectionDate, cycleDays);
  const now = new Date();

  const daysUntilDue = differenceInDays(nextInspectionDate, now);

  if (daysUntilDue < 0) return 'danger';    // Czas minął
  if (daysUntilDue <= 7) return 'warning';  // Zbliża się (do 7 dni)
  return 'ok';                              // OK
}

function App() {
  const [machines, setMachines] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // State for Inspector Modal
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inspectionNote, setInspectionNote] = useState('');
  const [inspectionImage, setInspectionImage] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Prosta symulacja ładowania z LocalStorage
    const savedMachines = localStorage.getItem('tpm_machines');
    if (savedMachines) {
      setMachines(JSON.parse(savedMachines));
    } else {
      setMachines(initialMachines);
      localStorage.setItem('tpm_machines', JSON.stringify(initialMachines));
    }
  }, []);

  const handleOpenInspection = (machine) => {
    setSelectedMachine(machine);
    setIsModalOpen(true);
    setInspectionNote('');
    setInspectionImage(null);
  };

  const handleOpenHistory = (machine) => {
    setSelectedMachine(machine);
    setIsHistoryModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsHistoryModalOpen(false);
    setActiveImagePreview(null);
    setTimeout(() => {
      if (!isHistoryModalOpen && !isModalOpen) setSelectedMachine(null)
    }, 300); // Wait for transition
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInspectionImage(reader.result); // Zapis do base64 (DataURL) - ok dla prototypu z localstorage
      };
      reader.readAsDataURL(file);
    }
  };

  const saveInspection = () => {
    if (!selectedMachine) return;

    const todayStr = formatDate(new Date());

    // Tworzymy historię (w docelowym systemie zrobimy oddzielną tabelę)
    const newInspectionLog = {
      date: todayStr,
      note: inspectionNote,
      image: inspectionImage,
      inspector: 'Zalogowany Użytkownik'
    };

    const updatedMachines = machines.map(m => {
      if (m.id === selectedMachine.id) {
        const history = m.history || [];
        return {
          ...m,
          lastInspection: todayStr,
          history: [newInspectionLog, ...history]
        };
      }
      return m;
    });

    setMachines(updatedMachines);
    localStorage.setItem('tpm_machines', JSON.stringify(updatedMachines));
    handleCloseModal();
  };

  // Wzbogacenie obiektów o dynamiczny status przed renderowaniem
  const machinesWithStatus = machines.map(machine => ({
    ...machine,
    status: calculateStatus(machine.lastInspection, machine.cycleDays),
    nextInspection: format(addDays(parseISO(machine.lastInspection), machine.cycleDays), 'yyyy-MM-dd')
  }));

  const filteredMachines = machinesWithStatus.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || m.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Statystyki
  const stats = {
    total: machinesWithStatus.length,
    ok: machinesWithStatus.filter(m => m.status === 'ok').length,
    warning: machinesWithStatus.filter(m => m.status === 'warning').length,
    danger: machinesWithStatus.filter(m => m.status === 'danger').length,
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ok': return <CheckCircle2 size={24} color="var(--status-ok)" />;
      case 'warning': return <Clock size={24} color="var(--status-warning)" />;
      case 'danger': return <AlertCircle size={24} color="var(--status-danger)" />;
      default: return null;
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'ok': return 'badge-ok';
      case 'warning': return 'badge-warning';
      case 'danger': return 'badge-danger';
      default: return '';
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="glass-panel header-panel">
        <div className="header-content">
          <div className="logo-area">
            <ClipboardList size={32} color="var(--accent-primary)" />
            <div>
              <h1 className="text-h2 text-gradient">TPM Inspector</h1>
              <p className="text-small">System Zarządzania Przeglądami Maszyn</p>
            </div>
          </div>

          <div className="header-actions">
            <button className="btn btn-ghost btn-icon">
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="container main-content">

        {/* Stats Row */}
        <section className="stats-grid animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="glass-panel stat-card">
            <h3 className="text-small">Wszystkie Maszyny</h3>
            <p className="text-h1">{stats.total}</p>
          </div>
          <div className="glass-panel stat-card stat-ok">
            <h3 className="text-small">Przeglądy Aktualne</h3>
            <p className="text-h1" style={{ color: 'var(--status-ok)' }}>{stats.ok}</p>
          </div>
          <div className="glass-panel stat-card stat-warning">
            <h3 className="text-small">Zbliżający się termin</h3>
            <p className="text-h1" style={{ color: 'var(--status-warning)' }}>{stats.warning}</p>
          </div>
          <div className="glass-panel stat-card stat-danger status-indicator-danger">
            <h3 className="text-small">Przeglądy Zaległe</h3>
            <p className="text-h1" style={{ color: 'var(--status-danger)' }}>{stats.danger}</p>
          </div>
        </section>

        {/* List Controls */}
        <section className="glass-panel controls-panel animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="search-box">
            <Search size={20} className="search-icon" color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Szukaj po nazwie lub ID operacji..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-box">
            <Filter size={20} className="filter-icon" color="var(--text-muted)" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Wszystkie statusy</option>
              <option value="danger">Zaległe (Zagrożenie)</option>
              <option value="warning">Do zrobienia (Ostrzeżenie)</option>
              <option value="ok">Zrobione (Aktualne)</option>
            </select>
          </div>
        </section>

        {/* Machine List */}
        <section className="machine-list animate-fade-in" style={{ animationDelay: '0.3s' }}>
          {filteredMachines.length > 0 ? (
            filteredMachines.map((machine) => (
              <div key={machine.id} className={`glass-panel machine-card ${getStatusBadgeClass(machine.status)}`}>
                <div className="machine-status-icon">
                  {getStatusIcon(machine.status)}
                </div>

                <div className="machine-info">
                  <span className="machine-id">{machine.id}</span>
                  <h3 className="text-h3">{machine.name}</h3>
                  <p className="text-small">{machine.department}</p>
                </div>

                <div className="machine-meta">
                  <div className="meta-item">
                    <span className="text-small">Kolejny przegląd:</span>
                    <strong>{machine.nextInspection}</strong>
                  </div>
                  <div className="meta-item hide-mobile">
                    <span className="text-small">Ost. przegląd:</span>
                    <span style={{ color: 'var(--text-muted)' }}>{machine.lastInspection}</span>
                  </div>
                  <div className="meta-item hide-mobile">
                    <span className="text-small">Cykl (dni):</span>
                    <span style={{ color: 'var(--text-muted)' }}>{machine.cycleDays}</span>
                  </div>
                </div>

                <div className="machine-action" style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                  <button className="btn btn-outline" style={{ padding: '0.5rem 1rem' }} onClick={() => handleOpenHistory(machine)}>
                    <History size={16} />
                    <span className="hide-mobile">Historia</span>
                  </button>
                  <button className="btn btn-primary" style={{ padding: '0.5rem 1rem' }} onClick={() => handleOpenInspection(machine)}>
                    <Camera size={16} />
                    <span className="hide-mobile">Nowy TPM</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="glass-panel empty-state">
              <ClipboardList size={48} color="var(--text-muted)" />
              <h2 className="text-h3">Brak wyników</h2>
              <p className="text-body">Nie znaleziono maszyn spełniających kryteria.</p>
            </div>
          )}
        </section>

      </main>

      {/* Modal Nowego Przeglądu */}
      {isModalOpen && selectedMachine && (
        <div className="modal-overlay animate-fade-in" onClick={(e) => e.target.className.includes('modal-overlay') && handleCloseModal()}>
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <div>
                <h2 className="text-h2">Nowy Przegląd</h2>
                <p className="text-body">{selectedMachine.name} ({selectedMachine.id})</p>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={handleCloseModal}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="text-small">Skan / Zdjęcie Formularza Papierowego *</label>
                <div
                  className={`image-upload-zone ${inspectionImage ? 'has-image' : ''}`}
                  onClick={() => fileInputRef.current.click()}
                >
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment" // Ważne dla tabletów podpowiada domyślne użycie kamery tylnej
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleImageUpload}
                  />
                  {inspectionImage ? (
                    <img src={inspectionImage} alt="Skan formularza" className="uploaded-image-preview" />
                  ) : (
                    <div className="upload-prompt">
                      <Camera size={48} color="var(--text-muted)" />
                      <p className="text-body mt-2">Zrób zdjęcie lub załącz plik formularza TPM</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="text-small">Dodatkowe Notatki (Opcjonalne)</label>
                <textarea
                  rows="3"
                  placeholder="Jeśli zauważyłeś jakieś nieprawidłowości, opisz je tutaj..."
                  value={inspectionNote}
                  onChange={(e) => setInspectionNote(e.target.value)}
                ></textarea>
              </div>

              <div className="modal-warning">
                <AlertCircle size={16} />
                <span>Zatwierdzając, potwierdzasz poprawne i fizyczne przeprowadzenie kontroli na maszynie. Cykl {selectedMachine.cycleDays} dni zostanie odnowiony.</span>
              </div>

            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={handleCloseModal}>Anuluj</button>
              <button
                className="btn btn-primary"
                onClick={saveInspection}
                disabled={!inspectionImage} // Wymagamy zdjęcia!
              >
                <CheckCircle2 size={18} />
                Zatwierdź Przegląd
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historii Przeglądów */}
      {isHistoryModalOpen && selectedMachine && (
        <div className="modal-overlay animate-fade-in" onClick={(e) => e.target.className.includes('modal-overlay') && handleCloseModal()}>
          <div className="modal-content glass-panel" style={{ maxWidth: '800px', height: '80vh' }}>
            {activeImagePreview ? (
              /* Widok pełnoekranowego zdjęcia */
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-header">
                  <div>
                    <h2 className="text-h3">Podgląd formularza</h2>
                  </div>
                  <button className="btn btn-ghost btn-icon" onClick={() => setActiveImagePreview(null)}>
                    <ArrowRight size={24} style={{ transform: 'rotate(180deg)' }} />
                  </button>
                </div>
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', borderRadius: '8px' }}>
                  <img src={activeImagePreview} alt="Skan formularza" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
              </div>
            ) : (
              /* Widok listy historii */
              <>
                <div className="modal-header">
                  <div>
                    <h2 className="text-h2">Historia Przeglądów</h2>
                    <p className="text-body">{selectedMachine.name} ({selectedMachine.id})</p>
                  </div>
                  <button className="btn btn-ghost btn-icon" onClick={handleCloseModal}>
                    <X size={24} />
                  </button>
                </div>

                <div className="modal-body" style={{ gap: '1rem' }}>
                  {(!selectedMachine.history || selectedMachine.history.length === 0) ? (
                    <div className="empty-state" style={{ padding: '2rem' }}>
                      <ClipboardList size={32} color="var(--text-muted)" />
                      <p className="text-body">Brak zapisanych przeglądów w systemie.</p>
                    </div>
                  ) : (
                    selectedMachine.history.map((record, idx) => (
                      <div key={idx} className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '3px solid var(--status-ok)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <strong>{record.date}</strong>
                            <p className="text-small">Wykonał: {record.inspector}</p>
                          </div>
                          {record.image && (
                            <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => setActiveImagePreview(record.image)}>
                              <ImageIcon size={16} /> Podgląd
                            </button>
                          )}
                        </div>
                        {record.note && (
                          <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.9rem' }}>
                            <em>"{record.note}"</em>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="modal-footer">
                  <button className="btn btn-outline" onClick={handleCloseModal}>Zamknij</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
