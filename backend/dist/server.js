"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = __importDefault(require("./config/env"));
const app_1 = __importDefault(require("./app"));
app_1.default.listen(env_1.default.PORT, () => {
    console.log(`🚀 El Cuartito API running on port ${env_1.default.PORT}`);
    console.log(`Environment: ${env_1.default.NODE_ENV}`);
});
