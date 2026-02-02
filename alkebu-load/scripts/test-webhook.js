var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
// Test script to verify webhook endpoint is working
var WEBHOOK_URL = 'http://localhost:3000/api/webhooks/square-catalog';
function testWebhook() {
    return __awaiter(this, void 0, void 0, function () {
        var healthResponse, healthData, error_1, emptyResponse, emptyData, error_2, validEvent, validResponse, validData, error_3, invalidEvent, invalidResponse, invalidData, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🧪 Testing Square webhook endpoint...');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    console.log('\n1️⃣ Testing health check...');
                    return [4 /*yield*/, fetch(WEBHOOK_URL, { method: 'GET' })];
                case 2:
                    healthResponse = _a.sent();
                    return [4 /*yield*/, healthResponse.json()];
                case 3:
                    healthData = _a.sent();
                    console.log('✅ Health check response:', healthData);
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    console.error('❌ Health check failed:', error_1);
                    return [3 /*break*/, 5];
                case 5:
                    _a.trys.push([5, 8, , 9]);
                    console.log('\n2️⃣ Testing empty webhook body...');
                    return [4 /*yield*/, fetch(WEBHOOK_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: ''
                        })];
                case 6:
                    emptyResponse = _a.sent();
                    return [4 /*yield*/, emptyResponse.json()];
                case 7:
                    emptyData = _a.sent();
                    console.log('✅ Empty body response:', emptyData);
                    return [3 /*break*/, 9];
                case 8:
                    error_2 = _a.sent();
                    console.error('❌ Empty body test failed:', error_2);
                    return [3 /*break*/, 9];
                case 9:
                    _a.trys.push([9, 12, , 13]);
                    console.log('\n3️⃣ Testing valid webhook event...');
                    validEvent = {
                        type: 'catalog.version.updated',
                        merchant_id: 'TEST_MERCHANT',
                        data: {
                            type: 'catalog',
                            id: 'test-id',
                            object: {
                                catalog_version: {
                                    updated_at: new Date().toISOString()
                                }
                            }
                        },
                        created_at: new Date().toISOString()
                    };
                    return [4 /*yield*/, fetch(WEBHOOK_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(validEvent)
                        })];
                case 10:
                    validResponse = _a.sent();
                    return [4 /*yield*/, validResponse.json()];
                case 11:
                    validData = _a.sent();
                    console.log('✅ Valid event response:', validData);
                    return [3 /*break*/, 13];
                case 12:
                    error_3 = _a.sent();
                    console.error('❌ Valid event test failed:', error_3);
                    return [3 /*break*/, 13];
                case 13:
                    _a.trys.push([13, 16, , 17]);
                    console.log('\n4️⃣ Testing invalid event type...');
                    invalidEvent = {
                        type: 'payment.updated',
                        merchant_id: 'TEST_MERCHANT',
                        created_at: new Date().toISOString()
                    };
                    return [4 /*yield*/, fetch(WEBHOOK_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(invalidEvent)
                        })];
                case 14:
                    invalidResponse = _a.sent();
                    return [4 /*yield*/, invalidResponse.json()];
                case 15:
                    invalidData = _a.sent();
                    console.log('✅ Invalid event response:', invalidData);
                    return [3 /*break*/, 17];
                case 16:
                    error_4 = _a.sent();
                    console.error('❌ Invalid event test failed:', error_4);
                    return [3 /*break*/, 17];
                case 17:
                    console.log('\n🎯 Webhook tests completed!');
                    return [2 /*return*/];
            }
        });
    });
}
testWebhook().catch(console.error);
