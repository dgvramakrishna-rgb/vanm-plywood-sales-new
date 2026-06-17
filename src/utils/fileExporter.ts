import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// Helper to check if running inside Capacitor container or web PWA
export const isCapacitor = () => {
  return typeof (window as any).Capacitor !== 'undefined';
};

/**
 * Universally downloads/shares a CSV file depending on the platform (Web PWA or Android Native Capacitor).
 * This solves the issue where Android webviews block local file downloading.
 */
export async function exportToCsv(filename: string, csvHeaders: string[], rows: string[][]) {
  // Join headers and rows into standard CSV string
  const csvRows = [csvHeaders.join(',')];
  rows.forEach(r => {
    const safeRow = r.map(val => {
      // Replace quotes and clean data for CSV safely
      const cleanVal = String(val ?? '').replace(/"/g, '""');
      return `"${cleanVal}"`;
    });
    csvRows.push(safeRow.join(','));
  });
  
  const csvText = "\uFEFF" + csvRows.join('\n');

  if (isCapacitor()) {
    try {
      // Native Capacitor Flow for Android
      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: csvText,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      });

      // Show native share dialogue to allow saving or sending of CSV
      await Share.share({
        title: filename.replace('.csv', ''),
        text: 'Sharing field connective plywood daily visits CSV report file.',
        url: writeResult.uri,
        dialogTitle: 'Save / Send CSV Report'
      });
    } catch (error) {
      console.warn('Capacitor Native File Export failed, falling back to Web API:', error);
      triggerWebDownload(filename, csvText);
    }
  } else {
    // Normal Web Browser Flow
    triggerWebDownload(filename, csvText);
  }
}

function triggerWebDownload(filename: string, csvText: string) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
