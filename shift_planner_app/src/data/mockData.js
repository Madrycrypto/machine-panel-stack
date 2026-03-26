export const STATIONS = [
    { id: 'S1', name: 'Montaż 1' },
    { id: 'S2', name: 'Montaż 2' },
    { id: 'S3', name: 'Kontrola Jakości' },
    { id: 'S4', name: 'Pakowanie 1' },
    { id: 'S5', name: 'Pakowanie 2' }
];

export const WORKERS = [
    {
        id: 'W1',
        name: 'Jan',
        surname: 'Kowalski',
        defaultStation: 'S1',
        skills: { 'S1': 100, 'S2': 80, 'S3': 50, 'S4': 20, 'S5': 20 }
    },
    {
        id: 'W2',
        name: 'Adam',
        surname: 'Nowak',
        defaultStation: 'S2',
        skills: { 'S1': 70, 'S2': 100, 'S3': 60, 'S4': 30, 'S5': 30 }
    },
    {
        id: 'W3',
        name: 'Anna',
        surname: 'Wiśniewska',
        defaultStation: 'S3',
        skills: { 'S1': 40, 'S2': 40, 'S3': 100, 'S4': 80, 'S5': 80 }
    },
    {
        id: 'W4',
        name: 'Piotr',
        surname: 'Wójcik',
        defaultStation: 'S4',
        skills: { 'S1': 20, 'S2': 30, 'S3': 70, 'S4': 100, 'S5': 90 }
    },
    {
        id: 'W5',
        name: 'Katarzyna',
        surname: 'Kowalczyk',
        defaultStation: 'S5',
        skills: { 'S1': 10, 'S2': 20, 'S3': 60, 'S4': 90, 'S5': 100 }
    },
    // Extra floaters or substitutes
    {
        id: 'W6',
        name: 'Michał',
        surname: 'Kamiński',
        defaultStation: null, // Floater
        skills: { 'S1': 90, 'S2': 90, 'S3': 80, 'S4': 50, 'S5': 50 }
    },
    {
        id: 'W7',
        name: 'Magdalena',
        surname: 'Lewandowska',
        defaultStation: null, // Floater
        skills: { 'S1': 50, 'S2': 50, 'S3': 100, 'S4': 100, 'S5': 100 }
    }
];
