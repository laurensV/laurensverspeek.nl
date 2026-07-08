import qrcodegen from 'qrcode-generator'

// ASCII QR codes for the contact card: the matrix comes from qrcode-generator,
// and rendering packs two module rows into one text line with half blocks so
// the code stays roughly square in a monospace font (line-height must be 1).

/** QR module matrix (true = dark) with a quiet-zone border, scannable margin included. */
export function qrMatrix(text: string, quietZone = 2): boolean[][] {
  const qr = qrcodegen(0, 'M') // type 0 = auto-size, medium error correction
  qr.addData(text)
  qr.make()
  const count = qr.getModuleCount()
  const size = count + quietZone * 2
  const matrix: boolean[][] = Array.from({ length: size }, () => Array<boolean>(size).fill(false))
  for (let y = 0; y < count; y++) {
    for (let x = 0; x < count; x++) {
      matrix[y + quietZone]![x + quietZone] = qr.isDark(y, x)
    }
  }
  return matrix
}

/** Two matrix rows per line: ▀ top-only, ▄ bottom-only, █ both, space neither. */
export function halfBlockLines(matrix: boolean[][]): string[] {
  const lines: string[] = []
  for (let y = 0; y < matrix.length; y += 2) {
    const top = matrix[y]!
    const bottom = matrix[y + 1]
    let line = ''
    for (let x = 0; x < top.length; x++) {
      const t = top[x]!
      const b = bottom?.[x] ?? false
      line += t && b ? '█' : t ? '▀' : b ? '▄' : ' '
    }
    lines.push(line)
  }
  return lines
}

export function qrAsciiLines(text: string): string[] {
  return halfBlockLines(qrMatrix(text))
}
