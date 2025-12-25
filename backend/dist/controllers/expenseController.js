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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteExpense = exports.updateExpense = exports.createExpense = exports.getExpenses = void 0;
const firebaseAdmin_1 = require("../config/firebaseAdmin");
const admin = __importStar(require("firebase-admin"));
const getExpenses = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const db = (0, firebaseAdmin_1.getDb)();
        const snapshot = yield db.collection('expenses').orderBy('date', 'desc').get();
        const expenses = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        res.json(expenses);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getExpenses = getExpenses;
const createExpense = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date, category, description, amount, receiptUrl } = req.body;
        const db = (0, firebaseAdmin_1.getDb)();
        const expenseData = {
            date: date || new Date().toISOString().split('T')[0],
            category,
            description,
            amount: parseFloat(amount),
            receiptUrl,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        };
        const docRef = yield db.collection('expenses').add(expenseData);
        res.status(201).json(Object.assign({ id: docRef.id }, expenseData));
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.createExpense = createExpense;
const updateExpense = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const data = req.body;
        const db = (0, firebaseAdmin_1.getDb)();
        const updateData = Object.assign(Object.assign({}, data), { updated_at: admin.firestore.FieldValue.serverTimestamp() });
        if (data.amount)
            updateData.amount = parseFloat(data.amount);
        yield db.collection('expenses').doc(id).update(updateData);
        res.json(Object.assign({ id }, updateData));
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.updateExpense = updateExpense;
const deleteExpense = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const db = (0, firebaseAdmin_1.getDb)();
        yield db.collection('expenses').doc(id).delete();
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.deleteExpense = deleteExpense;
