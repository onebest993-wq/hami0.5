export const PRINT_STYLES = `
@media print {
  body * {
    visibility: hidden !important;
  }
  header,
  .print\\:hidden {
    display: none !important;
  }
  #contract-paper,
  #contract-paper * {
    visibility: visible !important;
  }
  #contract-paper {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 20mm !important;
    box-shadow: none !important;
    background: white !important;
  }
  #contract-paper .bg-slate-50,
  #contract-paper .bg-emerald-50,
  #contract-paper .bg-cyan-50,
  #contract-paper .bg-purple-50,
  #contract-paper .bg-yellow-100,
  #contract-paper .bg-blue-100,
  #contract-paper .bg-slate-100 {
    background: transparent !important;
  }
  #contract-paper .border-emerald-600,
  #contract-paper .border-cyan-600 {
    border-color: #000 !important;
  }
  @page {
    size: A4;
    margin: 0;
  }
}
`;
