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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const admin = __importStar(require("firebase-admin"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load .env from current directory
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '.env') });
const privateKey = (_a = process.env.FIREBASE_PRIVATE_KEY) === null || _a === void 0 ? void 0 : _a.replace(/\\n/g, '\n');
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const projectId = process.env.FIREBASE_PROJECT_ID;
if (!privateKey || !clientEmail || !projectId) {
    console.error('Missing Firebase credentials in .env');
    process.exit(1);
}
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
        }),
        storageBucket: 'el-cuartito-admin-records.appspot.com'
    });
}
const db = admin.firestore();
function deleteInvoice(invoiceNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`Searching for invoice ${invoiceNumber} to DELETE...`);
        const snapshot = yield db.collection('invoices').where('invoiceNumber', '==', invoiceNumber).get();
        if (snapshot.empty) {
            console.log('No invoice found.');
            return;
        }
        // We expect only 1, but if multiple, delete all
        for (const doc of snapshot.docs) {
            const data = doc.data();
            console.log(`Deleting Firestore doc: ${doc.id}`);
            yield db.collection('invoices').doc(doc.id).delete();
            console.log('✅ Firestore doc deleted.');
            if (data.storagePath) {
                console.log(`Deleting Storage file: ${data.storagePath}`);
                try {
                    yield admin.storage().bucket().file(data.storagePath).delete();
                    console.log('✅ Storage file deleted.');
                }
                catch (e) {
                    console.error('⚠️ Could not delete file (maybe already gone):', e.message);
                }
            }
        }
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // We only delete 2026-0004 as it is the duplicate of 0003
        yield deleteInvoice('2026-0004');
    });
}
main().catch(console.error);
