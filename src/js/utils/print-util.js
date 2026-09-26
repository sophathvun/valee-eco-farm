function openPrintWindow(title, htmlContent, orientation = 'portrait') {
    const printWin = window.open('', '_blank');
    if (!printWin) {
        alert('សូមអនុញ្ញាត (Allow Popups) ដើម្បីអាច Print បាន!');
        return;
    }
    
    // We use document.write so it creates a clean document
    printWin.document.open();
    printWin.document.write(
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>\</title>
            <link rel="stylesheet" href="assets/bootstrap.min.css">
            <style>
                @import url('assets/fonts/KhmerOSmuollight.ttf');
                
                @font-face {
                    font-family: 'Khmer OS Muol Light';
                    src: url('assets/fonts/KhmerOSmuollight.ttf') format('truetype');
                }
                
                body {
                    font-family: 'Battambang', sans-serif;
                    background-color: #fff;
                    color: #000;
                    margin: 0;
                    padding: 0;
                    -webkit-print-color-adjust: exact; 
                    print-color-adjust: exact;
                }
                
                /* Standardize report sizes */
                @page {
                    size: \;
                    margin: 10mm;
                }
                
                /* Invoice specific */
                .invoice-header-title {
                    font-family: 'Khmer OS Muol Light', cursive !important;
                }
                
                /* Utility classes */
                .page-break-after { page-break-after: always; break-after: page; }
                
                @media print {
                    .d-print-none { display: none !important; }
                }
            </style>
        </head>
        <body>
            \
            <script>
                // Wait a moment for fonts and images to load before printing
                window.onload = function() {
                    setTimeout(() => {
                        window.print();
                        // Optional: window.close() after print dialog closes
                    }, 500);
                };
            </script>
        </body>
        </html>
    );
    printWin.document.close();
}

window.openPrintWindow = openPrintWindow;

