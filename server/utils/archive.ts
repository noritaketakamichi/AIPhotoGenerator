import archiver from 'archiver';
import { createWriteStream } from 'fs';
import path from 'path';

export async function createZipArchive(fileNames: string[], zipPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    output.on('close', () => {
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Add each file to the archive
    fileNames.forEach(fileName => {
      const filePath = path.join(process.cwd(), 'uploads', fileName);
      archive.file(filePath, { name: fileName });
    });

    archive.finalize();
  });
}
