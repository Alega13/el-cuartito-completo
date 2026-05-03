import { Request, Response } from 'express';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export const printLabel = (req: Request, res: Response): void => {
    const { image } = req.body;

    if (!image || typeof image !== 'string') {
        res.status(400).json({ error: 'Se requiere el campo "image" en base64.' });
        return;
    }

    const tmpPath = path.join(os.tmpdir(), `label_temp_${Date.now()}.png`);

    try {
        fs.writeFileSync(tmpPath, Buffer.from(image, 'base64'));
    } catch (err) {
        res.status(500).json({ error: 'No se pudo guardar la imagen temporal.' });
        return;
    }

    const cmd = `brother_ql -b pyusb -m QL-570 -p usb://0x04f9:0x2028 print -l 62 -r 0 "${tmpPath}"`;

    exec(cmd, (error, stdout, stderr) => {
        try {
            fs.unlinkSync(tmpPath);
        } catch (_) {
            // ignore cleanup errors
        }

        if (error) {
            res.status(500).json({
                error: stderr.trim() || error.message || 'Error al ejecutar brother_ql.',
            });
            return;
        }

        res.json({ ok: true, message: 'Etiqueta enviada a la impresora.' });
    });
};
