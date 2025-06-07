"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobProcessor = void 0;
var server_client_1 = require("@/lib/supabase/server-client");
var document_generator_1 = require("@/lib/ai/document-generator");
var config_1 = require("@/lib/ai/config");
var settings_loader_1 = require("@/lib/ai/settings-loader");
var server_client_2 = require("@/lib/supabase/server-client");
var application_manager_1 = require("@/lib/utils/application-manager");
var JobProcessor = /** @class */ (function () {
    function JobProcessor() {
    }
    /**
     * Create a new job processing record
     */
    JobProcessor.createJob = function (userId, type, inputData, metadata) {
        return __awaiter(this, void 0, void 0, function () {
            var supabase, _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        supabase = (0, server_client_1.createServiceRoleClient)();
                        return [4 /*yield*/, supabase
                                .from('job_processing')
                                .insert({
                                user_id: userId,
                                type: type,
                                input_data: inputData,
                                metadata: metadata,
                                status: 'pending'
                            })
                                .select('id')
                                .single()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            console.error('Error creating job:', error);
                            throw new Error('Failed to create processing job');
                        }
                        return [2 /*return*/, data.id];
                }
            });
        });
    };
    /**
     * Update job status
     */
    JobProcessor.updateJobStatus = function (jobId, status, resultData, errorMessage) {
        return __awaiter(this, void 0, void 0, function () {
            var supabase, updateData, error;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        supabase = (0, server_client_1.createServiceRoleClient)();
                        updateData = { status: status };
                        if (status === 'processing') {
                            updateData.started_at = new Date().toISOString();
                        }
                        else if (status === 'completed' || status === 'failed') {
                            updateData.completed_at = new Date().toISOString();
                        }
                        if (resultData) {
                            updateData.result_data = resultData;
                        }
                        if (errorMessage) {
                            updateData.error_message = errorMessage;
                        }
                        return [4 /*yield*/, supabase
                                .from('job_processing')
                                .update(updateData)
                                .eq('id', jobId)];
                    case 1:
                        error = (_a.sent()).error;
                        if (error) {
                            console.error('Error updating job status:', error);
                            throw new Error('Failed to update job status');
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Create a notification for job completion
     */
    JobProcessor.createNotification = function (userId, jobId, type, title, message, metadata) {
        return __awaiter(this, void 0, void 0, function () {
            var supabase, error;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        supabase = (0, server_client_1.createServiceRoleClient)();
                        return [4 /*yield*/, supabase
                                .from('notifications')
                                .insert({
                                user_id: userId,
                                job_id: jobId,
                                type: type,
                                title: title,
                                message: message,
                                metadata: metadata
                            })];
                    case 1:
                        error = (_a.sent()).error;
                        if (error) {
                            console.error('Error creating notification:', error);
                            // Don't throw here - notifications are non-critical
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Parse resume text using AI
     */
    JobProcessor.parseResumeText = function (text, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var settings, supabase, settingsRow, error_1, systemPrompt, userPrompt, startTime, response, endTime, processingTime, parsedContent, structuredData;
            var _a, _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        settings = (0, settings_loader_1.loadServerSettings)();
                        if (!userId) return [3 /*break*/, 4];
                        _f.label = 1;
                    case 1:
                        _f.trys.push([1, 3, , 4]);
                        supabase = (0, server_client_2.createServerClient)();
                        return [4 /*yield*/, supabase
                                .from('user_settings')
                                .select('settings')
                                .eq('user_id', userId)
                                .single()];
                    case 2:
                        settingsRow = (_f.sent()).data;
                        if (settingsRow === null || settingsRow === void 0 ? void 0 : settingsRow.settings) {
                            settings = settingsRow.settings;
                            console.log("[AI PROCESSING] Loaded user-specific settings from database");
                        }
                        else {
                            console.log("[AI PROCESSING] No user settings found, using defaults");
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _f.sent();
                        console.error('[AI PROCESSING] Error loading user settings:', error_1);
                        return [3 /*break*/, 4];
                    case 4:
                        console.log("[AI PROCESSING] Starting resume parsing with provider: ".concat(settings.aiProvider, ", model: ").concat(settings.aiModel));
                        console.log("[AI PROCESSING] Text length: ".concat(text.length, " characters"));
                        console.log("[AI PROCESSING] Enable logging: ".concat(settings.enableLogging));
                        systemPrompt = "You are a resume parsing expert. Extract ALL structured information from the resume text and return it as JSON with these fields:\n    {\n      \"name\": \"Full name\",\n      \"email\": \"Email address\", \n      \"phone\": \"Phone number\",\n      \"address\": \"Complete address if available\",\n      \"linkedin\": \"LinkedIn profile URL if available\",\n      \"website\": \"Personal website/portfolio URL if available\",\n      \"summary\": \"Professional summary/objective\",\n      \"experience\": [{\"title\": \"Job title\", \"company\": \"Company name\", \"location\": \"Job location\", \"duration\": \"Employment duration\", \"description\": \"Job description\", \"technologies\": [\"tech1\", \"tech2\"]}],\n      \"education\": [{\"degree\": \"Degree\", \"school\": \"Institution\", \"location\": \"School location\", \"year\": \"Graduation year\", \"gpa\": \"GPA if mentioned\"}],\n      \"skills\": [\"skill1\", \"skill2\"],\n      \"certifications\": [{\"name\": \"Certification name\", \"issuer\": \"Issuing organization\", \"date\": \"Date obtained\", \"expiry\": \"Expiry date if applicable\", \"credential_id\": \"Credential ID if available\"}],\n      \"licenses\": [{\"name\": \"License name\", \"issuer\": \"Issuing authority\", \"date\": \"Date obtained\", \"expiry\": \"Expiry date\", \"license_number\": \"License number if available\"}],\n      \"training\": [{\"name\": \"Training/Course name\", \"provider\": \"Training provider\", \"date\": \"Date completed\", \"duration\": \"Duration if mentioned\"}],\n      \"projects\": [{\"name\": \"Project name\", \"description\": \"Project description\", \"technologies\": [\"tech1\", \"tech2\"], \"date\": \"Project date/duration\", \"url\": \"Project URL if available\"}],\n      \"awards\": [{\"name\": \"Award name\", \"issuer\": \"Issuing organization\", \"date\": \"Date received\", \"description\": \"Award description\"}],\n      \"publications\": [{\"title\": \"Publication title\", \"journal\": \"Journal/Conference name\", \"date\": \"Publication date\", \"url\": \"Publication URL if available\"}],\n      \"languages\": [{\"language\": \"Language name\", \"proficiency\": \"Proficiency level\"}],\n      \"references\": [{\"name\": \"Reference name\", \"title\": \"Reference title\", \"company\": \"Reference company\", \"phone\": \"Reference phone\", \"email\": \"Reference email\"}],\n      \"volunteer\": [{\"organization\": \"Organization name\", \"role\": \"Volunteer role\", \"duration\": \"Duration\", \"description\": \"Volunteer description\"}],\n      \"hobbies\": [\"hobby1\", \"hobby2\"],\n      \"additional_sections\": [{\"section_title\": \"Section name\", \"content\": \"Section content\"}]\n    }\n    \n    Instructions:\n    - Extract ALL information present in the resume, don't skip any sections\n    - If a field is not present, omit it from the JSON (don't include empty arrays or null values)\n    - For dates, preserve the original format from the resume\n    - For arrays, only include them if there are actual items to add\n    - Be thorough and capture every piece of information\n    - If there are custom sections not covered above, put them in \"additional_sections\"\n    \n    SKILLS EXTRACTION REQUIREMENTS:\n    - The \"skills\" field MUST be an array of individual skill strings: [\"skill1\", \"skill2\", \"skill3\"]\n    - Extract ALL technical skills, soft skills, and competencies mentioned\n    - Break down comma-separated skill lists into individual array items\n    - Break down skill categories into individual skills (e.g., \"Programming: Python, Java, C++\" becomes [\"Python\", \"Java\", \"C++\"])\n    - Include tools, technologies, frameworks, languages, methodologies, certifications as skills\n    - Do NOT group skills into categories or objects - use flat string array only\n    \n    TECHNOLOGY EXTRACTION FOR PROJECTS & EXPERIENCE:\n    - For each project and experience entry, extract technologies, tools, frameworks, languages, and platforms mentioned\n    - Look for technology keywords in the description like: Python, Java, React, AWS, Docker, etc.\n    - Extract version numbers if mentioned (e.g., \"Python 3.9\" \u2192 \"Python 3.9\")\n    - Include databases (MySQL, PostgreSQL, MongoDB), cloud services (AWS, Azure, GCP), and tools (Git, Jenkins, Kubernetes)\n    - The \"technologies\" array should be concise - only include actual technologies, not general terms\n    - Example: \"Built web app using React, Node.js, and MongoDB\" \u2192 technologies: [\"React\", \"Node.js\", \"MongoDB\"]\n    \n    CRITICAL JSON FORMATTING REQUIREMENTS:\n    - Return ONLY valid JSON. No markdown code blocks, no explanatory text before or after.\n    - Start directly with { and end with }\n    - Ensure ALL strings are properly escaped and terminated with closing quotes\n    - Ensure ALL objects and arrays are properly closed with } and ]\n    - Double-check that the final character is } to complete the JSON object\n    - NO trailing commas, NO incomplete strings, NO unterminated objects";
                        userPrompt = "Parse this resume text:\n\n".concat(text);
                        // Use the configured AI provider and model from settings
                        console.log("[AI PROCESSING] Sending request to ".concat(settings.aiProvider, " with model ").concat(settings.aiModel));
                        startTime = Date.now();
                        return [4 /*yield*/, (0, config_1.queryAI)(userPrompt, systemPrompt, settings, 'resume_parsing')];
                    case 5:
                        response = _f.sent();
                        endTime = Date.now();
                        processingTime = endTime - startTime;
                        console.log("[AI PROCESSING] Response received in ".concat(processingTime, "ms"));
                        console.log("[AI PROCESSING] Provider: ".concat(settings.aiProvider, ", Model: ").concat(settings.aiModel));
                        parsedContent = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content;
                        if (!parsedContent) {
                            console.error('[AI PROCESSING] No content received from AI');
                            throw new Error('No parsed content received from AI');
                        }
                        console.log("[AI PROCESSING] Response length: ".concat(parsedContent.length, " characters"));
                        if (settings.enableLogging) {
                            console.log("[AI PROCESSING] Raw response preview: ".concat(parsedContent.substring(0, 500), "..."));
                        }
                        try {
                            // First, try parsing as-is
                            structuredData = JSON.parse(parsedContent);
                            console.log("[AI PROCESSING] Successfully parsed JSON response");
                            if (settings.enableLogging) {
                                console.log("[AI PROCESSING] Extracted data preview:", {
                                    name: structuredData.name || 'N/A',
                                    email: structuredData.email || 'N/A',
                                    phone: structuredData.phone || 'N/A',
                                    experienceCount: ((_c = structuredData.experience) === null || _c === void 0 ? void 0 : _c.length) || 0,
                                    educationCount: ((_d = structuredData.education) === null || _d === void 0 ? void 0 : _d.length) || 0,
                                    skillsCount: ((_e = structuredData.skills) === null || _e === void 0 ? void 0 : _e.length) || 0
                                });
                            }
                        }
                        catch (parseError) {
                            console.error('[AI PROCESSING] JSON parsing failed:', parseError);
                            throw new Error('Failed to parse AI response as JSON');
                        }
                        return [2 /*return*/, {
                                parsedData: structuredData,
                                aiProvider: settings.aiProvider,
                                aiModel: settings.aiModel
                            }];
                }
            });
        });
    };
    /**
     * Process a resume parsing job
     */
    JobProcessor.processResumeParseJob = function (job) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, content, filename, userId, _b, parsedData, aiProvider, aiModel, supabase, timestamp, filePath, _c, resumeData, resumeError, error_2;
            var _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        _f.trys.push([0, 6, , 9]);
                        return [4 /*yield*/, this.updateJobStatus(job.id, 'processing')];
                    case 1:
                        _f.sent();
                        _a = job.input_data, content = _a.content, filename = _a.filename, userId = _a.userId;
                        return [4 /*yield*/, this.parseResumeText(content, userId)];
                    case 2:
                        _b = _f.sent(), parsedData = _b.parsedData, aiProvider = _b.aiProvider, aiModel = _b.aiModel;
                        supabase = (0, server_client_1.createServiceRoleClient)();
                        timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                        filePath = "resumes/".concat(job.user_id, "/").concat(timestamp, "_").concat(filename || 'resume.pdf');
                        return [4 /*yield*/, supabase
                                .from('resumes')
                                .insert({
                                user_id: job.user_id,
                                file_path: filePath,
                                file_name: filename || 'Untitled Resume',
                                file_type: ((_d = job.metadata) === null || _d === void 0 ? void 0 : _d.fileType) || 'application/pdf',
                                file_size: ((_e = job.metadata) === null || _e === void 0 ? void 0 : _e.fileSize) || 0,
                                extracted_text: job.input_data.content,
                                processing_status: 'completed',
                                ai_provider: aiProvider,
                                ai_model: aiModel,
                                parsed_data: parsedData
                            })
                                .select()
                                .single()];
                    case 3:
                        _c = _f.sent(), resumeData = _c.data, resumeError = _c.error;
                        if (resumeError) {
                            console.error('Error saving resume to database:', resumeError);
                            throw new Error('Failed to save resume to database');
                        }
                        // Update job with results and resume ID
                        return [4 /*yield*/, this.updateJobStatus(job.id, 'completed', __assign(__assign({}, parsedData), { resumeId: resumeData.id }))];
                    case 4:
                        // Update job with results and resume ID
                        _f.sent();
                        // Create notification
                        return [4 /*yield*/, this.createNotification(job.user_id, job.id, 'job_completed', 'Resume Parsed Successfully', 'Your resume has been processed and is ready to view.', { filename: filename, resumeId: resumeData.id })];
                    case 5:
                        // Create notification
                        _f.sent();
                        return [3 /*break*/, 9];
                    case 6:
                        error_2 = _f.sent();
                        console.error('Error processing resume parse job:', error_2);
                        return [4 /*yield*/, this.updateJobStatus(job.id, 'failed', null, error_2 instanceof Error ? error_2.message : 'Unknown error occurred')];
                    case 7:
                        _f.sent();
                        return [4 /*yield*/, this.createNotification(job.user_id, job.id, 'job_failed', 'Resume Parsing Failed', 'There was an error processing your resume. Please try again.', { error: error_2 instanceof Error ? error_2.message : 'Unknown error' })];
                    case 8:
                        _f.sent();
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Process a resume generation job
     */
    JobProcessor.processResumeGenerateJob = function (job) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, resumeData, jobDescription, userName, companyName, userId, jobDescriptionId, bypassTokenLimits, _b, pdf, fileName, supabase, filePath, uploadError, docId, error_3;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 9, , 12]);
                        return [4 /*yield*/, this.updateJobStatus(job.id, 'processing')];
                    case 1:
                        _c.sent();
                        _a = job.input_data, resumeData = _a.resumeData, jobDescription = _a.jobDescription, userName = _a.userName, companyName = _a.companyName, userId = _a.userId, jobDescriptionId = _a.jobDescriptionId, bypassTokenLimits = _a.bypassTokenLimits;
                        return [4 /*yield*/, (0, document_generator_1.generateAtsResume)(resumeData, jobDescription, userName, companyName, userId, bypassTokenLimits || false)];
                    case 2:
                        _b = _c.sent(), pdf = _b.pdf, fileName = _b.fileName;
                        supabase = (0, server_client_1.createServiceRoleClient)();
                        filePath = "resumes/".concat(userId, "/").concat(fileName);
                        return [4 /*yield*/, supabase.storage
                                .from('user_files')
                                .upload(filePath, Buffer.from(pdf), {
                                contentType: 'application/pdf',
                                upsert: false
                            })];
                    case 3:
                        uploadError = (_c.sent()).error;
                        if (uploadError) {
                            throw uploadError;
                        }
                        return [4 /*yield*/, (0, application_manager_1.saveGeneratedDocument)(userId, jobDescriptionId, 'resume', fileName, filePath)];
                    case 4:
                        docId = _c.sent();
                        if (!jobDescriptionId) return [3 /*break*/, 6];
                        return [4 /*yield*/, (0, application_manager_1.createOrUpdateApplication)(userId, jobDescriptionId, docId)];
                    case 5:
                        _c.sent();
                        _c.label = 6;
                    case 6: 
                    // Update job with results
                    return [4 /*yield*/, this.updateJobStatus(job.id, 'completed', {
                            fileName: fileName,
                            filePath: filePath,
                            documentId: docId,
                            companyName: companyName
                        })];
                    case 7:
                        // Update job with results
                        _c.sent();
                        // Create notification
                        return [4 /*yield*/, this.createNotification(job.user_id, job.id, 'job_completed', 'Resume Generated Successfully', "Your tailored resume for ".concat(companyName, " is ready to download."), { fileName: fileName, companyName: companyName, documentId: docId })];
                    case 8:
                        // Create notification
                        _c.sent();
                        return [3 /*break*/, 12];
                    case 9:
                        error_3 = _c.sent();
                        console.error('Error processing resume generate job:', error_3);
                        return [4 /*yield*/, this.updateJobStatus(job.id, 'failed', null, error_3 instanceof Error ? error_3.message : 'Unknown error occurred')];
                    case 10:
                        _c.sent();
                        return [4 /*yield*/, this.createNotification(job.user_id, job.id, 'job_failed', 'Resume Generation Failed', 'There was an error generating your resume. Please try again.', { error: error_3 instanceof Error ? error_3.message : 'Unknown error' })];
                    case 11:
                        _c.sent();
                        return [3 /*break*/, 12];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Process a cover letter generation job
     */
    JobProcessor.processCoverLetterJob = function (job) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, resumeData, jobDescription, userName, companyName, userId, jobDescriptionId, bypassTokenLimits, _b, pdf, fileName, supabase, filePath, pdfBuffer, uploadError, docId, error_4;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 9, , 12]);
                        return [4 /*yield*/, this.updateJobStatus(job.id, 'processing')];
                    case 1:
                        _c.sent();
                        _a = job.input_data, resumeData = _a.resumeData, jobDescription = _a.jobDescription, userName = _a.userName, companyName = _a.companyName, userId = _a.userId, jobDescriptionId = _a.jobDescriptionId, bypassTokenLimits = _a.bypassTokenLimits;
                        return [4 /*yield*/, (0, document_generator_1.generateCoverLetter)(resumeData, jobDescription, userName, companyName, userId, bypassTokenLimits || false)];
                    case 2:
                        _b = _c.sent(), pdf = _b.pdf, fileName = _b.fileName;
                        supabase = (0, server_client_1.createServiceRoleClient)();
                        filePath = "cover-letters/".concat(userId, "/").concat(fileName);
                        pdfBuffer = Buffer.from(pdf);
                        return [4 /*yield*/, supabase.storage
                                .from('user_files')
                                .upload(filePath, pdfBuffer, {
                                contentType: 'application/pdf',
                                upsert: false
                            })];
                    case 3:
                        uploadError = (_c.sent()).error;
                        if (uploadError) {
                            throw uploadError;
                        }
                        return [4 /*yield*/, (0, application_manager_1.saveGeneratedDocument)(userId, jobDescriptionId, 'cover_letter', fileName, filePath)];
                    case 4:
                        docId = _c.sent();
                        if (!jobDescriptionId) return [3 /*break*/, 6];
                        return [4 /*yield*/, (0, application_manager_1.createOrUpdateApplication)(userId, jobDescriptionId, undefined, docId)];
                    case 5:
                        _c.sent();
                        _c.label = 6;
                    case 6: 
                    // Update job with results
                    return [4 /*yield*/, this.updateJobStatus(job.id, 'completed', {
                            fileName: fileName,
                            filePath: filePath,
                            documentId: docId,
                            companyName: companyName
                        })];
                    case 7:
                        // Update job with results
                        _c.sent();
                        // Create notification
                        return [4 /*yield*/, this.createNotification(job.user_id, job.id, 'job_completed', 'Cover Letter Generated Successfully', "Your cover letter for ".concat(companyName, " is ready to download."), { fileName: fileName, companyName: companyName, documentId: docId })];
                    case 8:
                        // Create notification
                        _c.sent();
                        return [3 /*break*/, 12];
                    case 9:
                        error_4 = _c.sent();
                        console.error('Error processing cover letter job:', error_4);
                        return [4 /*yield*/, this.updateJobStatus(job.id, 'failed', null, error_4 instanceof Error ? error_4.message : 'Unknown error occurred')];
                    case 10:
                        _c.sent();
                        return [4 /*yield*/, this.createNotification(job.user_id, job.id, 'job_failed', 'Cover Letter Generation Failed', 'There was an error generating your cover letter. Please try again.', { error: error_4 instanceof Error ? error_4.message : 'Unknown error' })];
                    case 11:
                        _c.sent();
                        return [3 /*break*/, 12];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Main job processor - processes pending jobs
     */
    JobProcessor.processPendingJobs = function () {
        return __awaiter(this, arguments, void 0, function (batchSize) {
            var supabase, _a, jobs, error, promises;
            var _this = this;
            if (batchSize === void 0) { batchSize = 1; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        supabase = (0, server_client_1.createServiceRoleClient)();
                        return [4 /*yield*/, supabase
                                .from('job_processing')
                                .select('*')
                                .eq('status', 'pending')
                                .order('created_at', { ascending: true })
                                .limit(batchSize)];
                    case 1:
                        _a = _b.sent(), jobs = _a.data, error = _a.error;
                        if (error || !jobs || jobs.length === 0) {
                            return [2 /*return*/]; // No pending jobs
                        }
                        promises = jobs.map(function (job) { return _this.processJob(job); });
                        return [4 /*yield*/, Promise.allSettled(promises)];
                    case 2:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Process a specific job by ID
     */
    JobProcessor.processSpecificJob = function (jobId) {
        return __awaiter(this, void 0, void 0, function () {
            var job;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getJobStatus(jobId)];
                    case 1:
                        job = _a.sent();
                        if (!job || job.status !== 'pending') {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.processJob(job)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Process a single job
     */
    JobProcessor.processJob = function (job) {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = job.type;
                        switch (_a) {
                            case 'resume_parse': return [3 /*break*/, 1];
                            case 'resume_generate': return [3 /*break*/, 3];
                            case 'cover_letter': return [3 /*break*/, 5];
                        }
                        return [3 /*break*/, 7];
                    case 1: return [4 /*yield*/, this.processResumeParseJob(job)];
                    case 2:
                        _b.sent();
                        return [3 /*break*/, 9];
                    case 3: return [4 /*yield*/, this.processResumeGenerateJob(job)];
                    case 4:
                        _b.sent();
                        return [3 /*break*/, 9];
                    case 5: return [4 /*yield*/, this.processCoverLetterJob(job)];
                    case 6:
                        _b.sent();
                        return [3 /*break*/, 9];
                    case 7:
                        console.error('Unknown job type:', job.type);
                        return [4 /*yield*/, this.updateJobStatus(job.id, 'failed', null, 'Unknown job type')];
                    case 8:
                        _b.sent();
                        _b.label = 9;
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get job status
     */
    JobProcessor.getJobStatus = function (jobId) {
        return __awaiter(this, void 0, void 0, function () {
            var supabase, _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        supabase = (0, server_client_1.createServiceRoleClient)();
                        return [4 /*yield*/, supabase
                                .from('job_processing')
                                .select('*')
                                .eq('id', jobId)
                                .single()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            console.error('Error getting job status:', error);
                            return [2 /*return*/, null];
                        }
                        return [2 /*return*/, data];
                }
            });
        });
    };
    return JobProcessor;
}());
exports.JobProcessor = JobProcessor;
