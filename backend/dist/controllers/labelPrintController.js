"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.printLabel = void 0;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const printLabel = (req, res) => {
    const { image } = req.body;
    if (!image || typeof image !== 'string') {
        res.status(400).json({ error: 'Se requiere el campo "image" en base64.' });
        return;
    }
    const tmpPath = path.join(os.tmpdir(), `label_temp_${Date.now()}.png`);
    try {
        fs.writeFileSync(tmpPath, Buffer.from(image, 'base64'));
    }
    catch (err) {
        res.status(500).json({ error: 'No se pudo guardar la imagen temporal.' });
        return;
    }
    const cmd = `brother_ql -b pyusb -m QL-570 -p usb://0x04f9:0x2028 print -l 62 -r 0 "${tmpPath}"`;
    (0, child_process_1.exec)(cmd, (error, stdout, stderr) => {
        try {
            fs.unlinkSync(tmpPath);
        }
        catch (_) {
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
exports.printLabel = printLabel;
