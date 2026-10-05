"use strict";

// Функция для выделения домена второго уровня (SLD + TLD, например: "company.com")
function getSecondLevelDomain(hostname) {
    // Если это IP-адрес (например, 192.168.1.50) или localhost, возвращаем как есть
    if (/^[0-9.]+$/.test(hostname) || hostname === "localhost") {
        return hostname;
    }
    const parts = hostname.split(".");
    if (parts.length >= 2) {
        // Берем два последних элемента (например, ["company", "com"])
        return parts.slice(-2).join(".");
    }
    return hostname;
}

// Функция определения базового URL API на основе хоста
function getDynamicApiUrl() {
    let currentHost = "";

    if (document.referrer) {
        try {
            currentHost = new URL(document.referrer).hostname;

            console.log("currentHost: ", currentHost)
        } catch (e) {
            console.error("[AiTech] Ошибка парсинга referrer:", e);
        }
    }

    if (!currentHost) {
        currentHost = window.location.hostname;
    }

    // 1. Проверяем точные соответствия (словарь доменов)
    if (currentHost === "office.aisearch.tech") {
        return "https://api.aisearch.tech/api";
    }

    if (currentHost === "office.datahunter.store") {
        return "https://api.datahunter.store/api";
    }

    if (currentHost === "office.aisearch.ru") {
        return "https://api.aisearch.ru/api";
    }

    // 2. Если точного соответствия нет — собираем по маске: api.[домен_2_уровня]/api/v3/ai
    // Так как базовый конструктор OnlyOffice автоматически дописывает эндпоинты (версию/методы),
    // для super() мы отдаем корень "https://api." + sld, а в addon уйдет "v3/ai" или "v3".
    const sld = getSecondLevelDomain(currentHost);

    // Если это IP/localhost, маска api.192.168... не сработает, поэтому делаем проверку
    if (sld === currentHost && (currentHost === "localhost" || /^[0-9.]+$/.test(currentHost))) {
        return `http://${currentHost}:8080/api`; // Запасной вариант для локальной разработки
    }

    return `https://api.${sld}/api`;
}

class Provider extends AI.Provider {

    constructor() {

        const targetApiUrl = getDynamicApiUrl();
        console.log("[AiTech] Вычисленный базовый URL для провайдера:", targetApiUrl);

        // Передаем: Имя, Базовый URL, Ключ, Аддон (v3/ai)
        super("AiTech", targetApiUrl, "", "v3/ai");
        this.id = "AiTech";
    }

    // Вариант 1: Автоматическое получение всех доступных моделей с OpenRouter
    async getModels() {
        try {
            // OnlyOffice сам сделает запрос к https://openrouter.ai
            const response = await this.request("models", "GET");
            if (response && response.data) {
                return response.data.map(model => ({
                    id: model.id,        // Например: "google/gemini-2.5-flash"
                    name: model.name     // Имя модели в интерфейсе плагина
                }));
            }
        } catch (e) {
            console.error("Ошибка загрузки моделей OpenRouter:", e);
        }

        // Резервный хак (если сервер недоступен или вы хотите протестировать конкретную модель)
        return [
            {
                id: "google/gemini-2.5-flash",
                name: "Gemini 2.5 Flash (OpenRouter)"
            },
            {
                id: "openai/gpt-4o-mini",
                name: "GPT-4o Mini (OpenRouter)"
            }
        ];
    }

    checkExcludeModel(model) {
        return false;
    }

    checkModelCapability(model) {
        // Задаем лимит токенов для моделей OpenRouter (многие поддерживают 128k и более)
        model.options.max_input_tokens = AI.InputMaxTokens["128k"];

        // Стандартный эндпоинт OpenRouter для генерации текста и чата.
        // Полный путь будет: https://openrouter.ai
        model.endpoints = [
            "chat/completions"
        ];

        // Включаем поддержку чата, суммаризации и генерации текста в OnlyOffice
        return AI.CapabilitiesUI.Chat;
    }
}

// ПРЯМАЯ ИНИЦИАЛИЗАЦИЯ LOCALSTORAGE ПРИ ЗАГРУЗКЕ СКРИПТА
// ПРЯМАЯ ИНИЦИАЛИЗАЦИЯ ДВУХ КЛЮЧЕЙ LOCALSTORAGE
(function () {
    const STORAGE_KEY = "onlyoffice_ai_plugin_storage_key";
    const ACTIONS_KEY = "onlyoffice_ai_actions_key";

    // 1. ИНИЦИАЛИЗАЦИЯ КЛЮЧА ХРАНИЛИЩА МОДЕЛЕЙ (Добавлена модель aitech/ai-object-meta на первое место)
    if (!localStorage.getItem(STORAGE_KEY)) {
        const initialConfig = {
            "version": 4,
            "providers": {
                "AiTech": {
                    "name": "AiTech",
                    "url": getDynamicApiUrl()+"/v3/ai",
                    "key": "",
                    "models": [
                        {
                            "id": "aitech/ai-object-meta",
                            "slug": "aitech/ai-object-meta",
                            "name": "aitech/ai-object-meta",
                            "description": {
                                "en": "Our flagship model: understands text, sees photos, and hears voice.",
                                "ru": "Наша флагманская модель: понимает текст, видит фото и слышит голос.",
                                "es": "Nuestro modelo insignia: entiende texto, ve fotos y escucha voz."
                            },
                            "context_window": 200000,
                            "active": true,
                            "modalities": {
                                "input": {
                                    "text": {
                                        "price_1m": 2.5,
                                        "price_cache_read_1m": 1.25
                                    },
                                    "image": {
                                        "supported": true,
                                        "base_price": 0.01
                                    },
                                    "video": {
                                        "supported": true
                                    },
                                    "audio": {
                                        "price_sec": 0.0005
                                    }
                                },
                                "output": {
                                    "text": {
                                        "price_1m": 10
                                    },
                                    "image": {
                                        "base_price": 0.03,
                                        "high_res": {}
                                    },
                                    "video": {
                                        "price_sec": 0.033
                                    },
                                    "audio": {
                                        "price_sec": 0.002
                                    }
                                }
                            },
                            "endpoints": [
                                "chat/completions"
                            ],
                            "options": {
                                "max_input_tokens": 131072
                            }
                        }
                    ]
                },
                "OpenAI": {
                    "name": "OpenAI",
                    "url": "https://api.openai.com",
                    "key": "",
                    "models": []
                },
                "Google-Gemini": {
                    "name": "Google-Gemini",
                    "url": "https://generativelanguage.googleapis.com",
                    "key": "",
                    "models": []
                },
                "Anthropic": {
                    "name": "Anthropic",
                    "url": "https://api.anthropic.com",
                    "key": "",
                    "models": []
                },
                "xAI": {
                    "name": "xAI",
                    "url": "https://api.x.ai",
                    "key": "",
                    "models": []
                },
                "Stability AI": {
                    "name": "Stability AI",
                    "url": "https://api.stability.ai",
                    "key": "",
                    "models": []
                },
                "Deepseek": {
                    "name": "Deepseek",
                    "url": "https://api.deepseek.com",
                    "key": "",
                    "models": []
                },
                "Mistral": {
                    "name": "Mistral",
                    "url": "https://api.mistral.ai",
                    "key": "",
                    "models": []
                },
                "Together AI": {
                    "name": "Together AI",
                    "url": "https://api.together.xyz",
                    "key": "",
                    "models": []
                },
                "Groq": {
                    "name": "Groq",
                    "url": "https://api.groq.com/openai",
                    "key": "",
                    "models": []
                },
                "OpenRouter": {
                    "name": "OpenRouter",
                    "url": "https://openrouter.ai/api",
                    "key": "",
                    "models": []
                },
                "Ollama": {
                    "name": "Ollama",
                    "url": "http://localhost:11434",
                    "key": "",
                    "models": []
                },
                "LM Studio": {
                    "name": "LM Studio",
                    "url": "http://localhost:1234",
                    "key": "",
                    "models": []
                },
                "ZhiPu": {
                    "name": "ZhiPu",
                    "url": "https://open.bigmodel.cn/api/paas/v4",
                    "key": "",
                    "models": []
                }
            },
            "models": [
                {
                    "capabilities": 1,
                    "provider": "AiTech",
                    "name": "AiTech [aitech/ai-object-meta]",
                    "id": "aitech/ai-object-meta"
                }
            ],
            "customProviders": {}
        };

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(initialConfig));
            console.log("[AiTech] Ключ моделей (storage_key) успешно инициализирован.");
        } catch (e) {
            console.error("[AiTech] Ошибка записи storage_key:", e);
        }
    }

    // 2. ИНИЦИАЛИЗАЦИЯ КЛЮЧА ДЕЙСТВИЙ И КНОПОК ИНТЕРФЕЙСА
    if (!localStorage.getItem(ACTIONS_KEY)) {
        const initialActions = {
            "Chat": {
                "name": "Chatbot",
                "icon": "ask-ai",
                "model": "aitech/ai-object-meta",
                "capabilities": 1
            },
            "Summarization": {
                "name": "Summarization",
                "icon": "summarization",
                "model": "aitech/ai-object-meta",
                "capabilities": 1
            },
            "Translation": {
                "name": "Translation",
                "icon": "translation",
                "model": "aitech/ai-object-meta",
                "capabilities": 1
            },
            "TextAnalyze": {
                "name": "Text analysis",
                "icon": "text-analysis-ai",
                "model": "aitech/ai-object-meta",
                "capabilities": 1
            },
            "ImageGeneration": {
                "name": "Image generation",
                "icon": "image-ai",
                "model": "",
                "capabilities": 2
            },
            "OCR": {
                "name": "OCR",
                "icon": "ocr",
                "model": "",
                "capabilities": 128
            },
            "Vision": {
                "name": "Vision",
                "icon": "vision-ai",
                "model": "",
                "capabilities": 128
            }
        };

        try {
            localStorage.setItem(ACTIONS_KEY, JSON.stringify(initialActions));
            console.log("[AiTech] Ключ действий (actions_key) успешно инициализирован.");
        } catch (e) {
            console.error("[AiTech] Ошибка записи actions_key:", e);
        }
    }

    // Штатная регистрация класса в системе плагина ONLYOFFICE
    if (window.Asc && window.Asc.AI) {
        window.Asc.AI.MyAiTechProvider = Provider;
        if (typeof window.Asc.AI.registerProvider === "function") {
            window.Asc.AI.registerProvider(new Provider());
        }
    }
})();