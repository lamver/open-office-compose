"use strict";

class Provider extends AI.Provider {

	constructor() {
		// Параметры для OpenRouter:
		// 1. Имя в списке OnlyOffice
		// 2. Базовый URL OpenRouter
		// 3. API-ключ (в OnlyOffice он обычно подтягивается из настроек плагина)
		// 4. Дополнительный путь к API (v1)
		super("AiTech", "https://dev-api.aisearch.tech/api", "", "v3");
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
