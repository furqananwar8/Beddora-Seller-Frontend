export const exportChartCSV = (filename: string, rows: Array<Record<string, string | number>>) => {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0])
  const lines = rows.map((row) => headers.map((header) => String(row[header] ?? '')).join(','))
  const csv = [headers.join(','), ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const exportChartPDF = (title: string, rows: Array<Record<string, string | number>>) => {
  if (rows.length === 0) return
  const win = window.open('', '_blank')
  if (!win) return

  const headers = Object.keys(rows[0])
  const tableRows = rows
    .map(
      (row) => `
        <tr>
          ${headers.map((header) => `<td>${row[header] ?? ''}</td>`).join('')}
        </tr>
      `
    )
    .join('')

  win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ccc; padding: 8px; font-size: 12px; }
          th { background: #f3f4f6; text-align: left; }
        </style>
      </head>
      <body>
        <h2>${title}</h2>
        <table>
          <thead>
            <tr>
              ${headers.map((header) => `<th>${header}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
    </html>
  `)
  win.document.close()
  win.focus()
  win.print()
}

