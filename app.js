class RecipeBookApp {
    constructor() {
        this.apiKey = null;
        this.recipes = this.loadRecipes();
        this.currentRecipeId = null;
        this.currentSection = 'recipes';
        this.filteredRecipes = this.recipes;
        
        // Test URLs for scraper testing
        this.testUrls = [
            'https://www.kwestiasmaku.com/przepis/zupa-z-pieczonych-warzyw',
            'https://www.kwestiasmaku.com/przepis/carpaccio-figowe',
            'https://aniagotuje.pl/przepis/curry-z-dynia-i-ciecierzyca',
            'https://aniagotuje.pl/przepis/niewidzialne-ciasto-z-jablkami'
        ];
        
        // CORS proxies for web scraping
        this.corsProxies = [
            'https://api.allorigins.win/get?url=',
            'https://cors-anywhere.herokuapp.com/',
            'https://thingproxy.freeboard.io/fetch/',
            'https://api.codetabs.com/v1/proxy?quest='
        ];
        
        this.claudeModel = 'claude-3-haiku-20240307';
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateApiStatus();
        this.showSection('recipes');
        this.renderRecipes();
    }

    setupEventListeners() {
        // API Key management
        document.getElementById('saveApiKey').addEventListener('click', () => this.saveApiKey());
        document.getElementById('apiKey').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveApiKey();
        });

        // Navigation
        document.getElementById('navRecipes').addEventListener('click', () => this.showSection('recipes'));
        document.getElementById('navAdd').addEventListener('click', () => this.showSection('add'));
        document.getElementById('navTest').addEventListener('click', () => this.showSection('test'));

        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => this.searchRecipes(e.target.value));

        // Add recipe functionality
        document.getElementById('extractRecipe').addEventListener('click', () => this.extractFromUrl());
        document.getElementById('recipeForm').addEventListener('submit', (e) => this.handleFormSubmit(e));
        document.getElementById('clearForm').addEventListener('click', () => this.clearForm());

        // Test functionality
        document.getElementById('runTests').addEventListener('click', () => this.runScraperTests());

        // Modal functionality
        document.getElementById('closeModal').addEventListener('click', () => this.hideModal());
        document.getElementById('closeModalBtn').addEventListener('click', () => this.hideModal());
        document.getElementById('editRecipe').addEventListener('click', () => this.editCurrentRecipe());
        document.getElementById('deleteRecipe').addEventListener('click', () => this.deleteCurrentRecipe());
        
        // Close modal on backdrop click
        document.getElementById('recipeModal').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                this.hideModal();
            }
        });

        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !document.getElementById('recipeModal').classList.contains('hidden')) {
                this.hideModal();
            }
        });
    }

    saveApiKey() {
        const apiKey = document.getElementById('apiKey').value.trim();
        if (!apiKey) {
            this.showToast('Proszę wprowadzić klucz API', 'error');
            return;
        }

        if (!apiKey.startsWith('sk-ant-')) {
            this.showToast('Nieprawidłowy format klucza Claude API', 'error');
            return;
        }

        this.apiKey = apiKey;
        this.updateApiStatus();
        this.showToast('Klucz API zapisany pomyślnie', 'success');
    }

    updateApiStatus() {
        const status = document.getElementById('apiStatus');
        if (this.apiKey) {
            status.textContent = 'Skonfigurowano';
            status.className = 'status status--success';
        } else {
            status.textContent = 'Nie skonfigurowano';
            status.className = 'status status--warning';
        }
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.add('hidden');
        });

        // Show selected section
        document.getElementById(`${sectionName}Section`).classList.remove('hidden');

        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`nav${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}`).classList.add('active');

        this.currentSection = sectionName;

        // Clear form when switching to add section
        if (sectionName === 'add') {
            this.clearForm();
        }
    }

    searchRecipes(query) {
        if (!query.trim()) {
            this.filteredRecipes = this.recipes;
        } else {
            const searchTerm = query.toLowerCase().trim();
            this.filteredRecipes = this.recipes.filter(recipe => {
                return recipe.name.toLowerCase().includes(searchTerm) ||
                       recipe.ingredients.some(ingredient => 
                           ingredient.toLowerCase().includes(searchTerm)
                       ) ||
                       recipe.instructions.some(instruction => 
                           instruction.toLowerCase().includes(searchTerm)
                       );
            });
        }
        
        this.renderRecipes();
    }

    async extractFromUrl() {
        const url = document.getElementById('recipeUrl').value.trim();
        
        if (!url) {
            this.showToast('Proszę wprowadzić URL przepisu', 'error');
            return;
        }

        try {
            new URL(url);
        } catch (e) {
            this.showToast('Nieprawidłowy adres URL', 'error');
            return;
        }

        const extractBtn = document.getElementById('extractRecipe');
        const btnText = extractBtn.querySelector('.btn-text');
        const btnLoading = extractBtn.querySelector('.btn-loading');
        
        extractBtn.disabled = true;
        btnText.classList.add('hidden');
        btnLoading.classList.remove('hidden');

        this.updateExtractionStatus('🤖 Analizuję stronę...', 'info');

        try {
            const recipe = await this.extractRecipe(url);
            
            if (recipe && recipe.ingredients.length > 0 && recipe.instructions.length > 0) {
                document.getElementById('recipeName').value = recipe.name;
                document.getElementById('prepTime').value = recipe.prepTime;
                document.getElementById('ingredients').value = recipe.ingredients.join('\n');
                document.getElementById('instructions').value = recipe.instructions.join('\n');

                this.updateExtractionStatus('🎉 Przepis wyodrębniony pomyślnie!', 'success');
            } else {
                throw new Error('Nie udało się wyodrębnić przepisu');
            }
            
        } catch (error) {
            console.error('Extraction error:', error);
            this.updateExtractionStatus(`❌ ${error.message}`, 'error');
            
        } finally {
            extractBtn.disabled = false;
            btnText.classList.remove('hidden');
            btnLoading.classList.add('hidden');
        }
    }

    async extractRecipe(url) {
        console.log('🔍 Extracting recipe from:', url);
        
        try {
            // 1. Fetch page content
            const html = await this.fetchPageContent(url);
            console.log('✅ Fetched HTML:', html.length, 'characters');

            // 2. Try JSON-LD first (most reliable)
            const jsonRecipe = this.parseJsonLD(html);
            if (jsonRecipe && jsonRecipe.ingredients.length > 2) {
                console.log('✅ Found JSON-LD recipe');
                jsonRecipe.source = url;
                jsonRecipe.image = this.extractImage(html, url);
                return jsonRecipe;
            }

            // 3. Try Microdata
            const microdataRecipe = this.parseMicrodata(html);
            if (microdataRecipe && microdataRecipe.ingredients.length > 2) {
                console.log('✅ Found Microdata recipe');
                microdataRecipe.source = url;
                microdataRecipe.image = this.extractImage(html, url);
                return microdataRecipe;
            }

            // 4. Claude AI - intelligent parsing
            if (this.apiKey) {
                console.log('🤖 Using Claude AI for analysis...');
                const aiRecipe = await this.parseWithClaude(html, url);
                if (aiRecipe) {
                    aiRecipe.source = url;
                    aiRecipe.image = this.extractImage(html, url) || this.getDefaultImage(aiRecipe.name);
                    return aiRecipe;
                }
            }

            // 5. Basic HTML parsing as fallback
            const htmlRecipe = this.parseBasicHtml(html, url);
            if (htmlRecipe) {
                htmlRecipe.source = url;
                htmlRecipe.image = this.extractImage(html, url);
                return htmlRecipe;
            }

            throw new Error('Nie udało się wyodrębnić przepisu z żadnej metody');

        } catch (error) {
            console.error('❌ Extraction error:', error);
            throw error;
        }
    }

    async fetchPageContent(url) {
        let lastError = null;
        
        for (let i = 0; i < this.corsProxies.length; i++) {
            const proxy = this.corsProxies[i];
            try {
                console.log(`🌐 Attempt ${i + 1}/${this.corsProxies.length}: ${proxy.split('/')[2]}`);
                
                let proxyUrl;
                if (proxy.includes('allorigins.win')) {
                    proxyUrl = `${proxy}${encodeURIComponent(url)}`;
                } else {
                    proxyUrl = `${proxy}${url}`;
                }
                
                const response = await fetch(proxyUrl, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    timeout: 10000
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                let content;
                if (proxy.includes('allorigins.win')) {
                    const data = await response.json();
                    content = data.contents;
                } else {
                    content = await response.text();
                }
                
                if (!content || content.length < 1000) {
                    throw new Error('Content too short');
                }
                
                console.log(`✅ Success with ${proxy.split('/')[2]}`);
                return content;
                
            } catch (error) {
                console.warn(`❌ Proxy ${i + 1} failed:`, error.message);
                lastError = error;
                
                if (i < this.corsProxies.length - 1) {
                    await this.sleep(500);
                }
            }
        }
        
        throw new Error(`All proxies failed: ${lastError?.message}`);
    }

    parseJsonLD(html) {
        const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis;
        let match;
        
        while ((match = jsonLdRegex.exec(html)) !== null) {
            try {
                const jsonString = match[1].trim();
                const data = JSON.parse(jsonString);
                const items = Array.isArray(data) ? data : [data];
                
                for (const item of items) {
                    if (item['@type'] === 'Recipe' || (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))) {
                        const recipe = {
                            name: this.cleanText(item.name || 'Przepis'),
                            prepTime: this.parseDuration(item.prepTime || item.cookTime || item.totalTime) || 'Nie podano',
                            ingredients: this.extractArray(item.recipeIngredient || []),
                            instructions: this.extractArray(item.recipeInstructions || [])
                        };
                        
                        if (recipe.ingredients.length > 0 && recipe.instructions.length > 0) {
                            return recipe;
                        }
                    }
                }
            } catch (e) {
                console.warn('JSON-LD parsing error:', e);
                continue;
            }
        }
        
        return null;
    }

    parseMicrodata(html) {
        try {
            const recipeMatch = html.match(/<[^>]+itemtype="[^"]*schema\.org\/Recipe"[^>]*>(.*?)<\/[^>]+>/s);
            if (!recipeMatch) return null;

            const recipeHtml = recipeMatch[0];
            
            const nameMatch = recipeHtml.match(/itemprop="name"[^>]*>([^<]+)/);
            const name = nameMatch ? this.cleanText(nameMatch[1]) : 'Przepis';

            const ingredients = [];
            const ingredientMatches = recipeHtml.match(/itemprop="recipeIngredient"[^>]*>([^<]+)/g) || [];
            ingredientMatches.forEach(match => {
                const ingredient = this.cleanText(match.replace(/itemprop="recipeIngredient"[^>]*>/, ''));
                if (ingredient.length > 2) ingredients.push(ingredient);
            });

            const instructions = [];
            const instructionMatches = recipeHtml.match(/itemprop="recipeInstructions"[^>]*>(.*?)<\//gs) || [];
            instructionMatches.forEach(match => {
                const instruction = this.cleanText(match.replace(/itemprop="recipeInstructions"[^>]*>/, ''));
                if (instruction.length > 10) instructions.push(instruction);
            });

            if (ingredients.length > 0 || instructions.length > 0) {
                return {
                    name,
                    prepTime: 'Sprawdź na stronie',
                    ingredients: ingredients.length > 0 ? ingredients : ['Sprawdź składniki na oryginalnej stronie'],
                    instructions: instructions.length > 0 ? instructions : ['Zobacz instrukcje na oryginalnej stronie']
                };
            }
        } catch (e) {
            console.warn('Microdata parsing error:', e);
        }
        return null;
    }

    async parseWithClaude(html, url) {
        if (!this.apiKey) {
            throw new Error('Brak klucza Claude API');
        }

        try {
            const cleanedHtml = this.cleanHtmlForAI(html);
            
            if (cleanedHtml.length < 500) {
                throw new Error('Za mało treści do analizy przez AI');
            }

            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: this.claudeModel,
                    max_tokens: 2000,
                    messages: [{
                        role: 'user',
                        content: `Analizuj tę stronę kulinarną i wyodrębnij przepis. Zwróć TYLKO poprawny JSON z polskimi znakami:

{
  "name": "pełna nazwa przepisu z ą,ć,ę,ł,ń,ó,ś,ź,ż",
  "prepTime": "czas przygotowania (np. 30 min)",  
  "ingredients": ["składnik 1", "składnik 2", "składnik 3"],
  "instructions": ["krok 1", "krok 2", "krok 3"]
}

ZASADY:
- Zachowuj polskie znaki
- Minimum 3 składniki i 3 kroki
- Tłumacz na polski jeśli trzeba
- Jeśli brak przepisu, zwróć {"error": "brak przepisu"}

URL: ${url}
HTML: ${cleanedHtml}`
                    }]
                })
            });

            if (!response.ok) {
                throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const content = data.content[0].text.trim();
            
            try {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    
                    if (parsed.error) {
                        throw new Error(parsed.error);
                    }

                    if (!parsed.name || !parsed.ingredients || !parsed.instructions) {
                        throw new Error('Claude zwróciło niepełny przepis');
                    }

                    if (parsed.ingredients.length < 2 || parsed.instructions.length < 2) {
                        throw new Error('Przepis ma za mało składników lub kroków');
                    }
                    
                    return parsed;
                }
                throw new Error('Brak JSON w odpowiedzi Claude');
            } catch (e) {
                console.error('Claude response parsing error:', e);
                throw new Error('Claude zwróciło niepoprawny JSON: ' + e.message);
            }

        } catch (error) {
            console.error('Claude AI error:', error);
            throw error;
        }
    }

    parseBasicHtml(html, url) {
        let name = this.extractRecipeNameFromUrl(url);
        const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i) || html.match(/<title[^>]*>(.*?)<\/title>/i);
        if (titleMatch) {
            const titleText = this.cleanText(titleMatch[1]);
            if (titleText.length > 5 && titleText.length < 100) {
                name = titleText.replace(/\s*[-|]\s*(Recipe|Przepis|Allrecipes).*$/i, '');
            }
        }

        return {
            name: name,
            prepTime: 'Sprawdź na stronie',
            ingredients: [`Składniki dostępne na ${new URL(url).hostname}`],
            instructions: [`Instrukcje dostępne na ${new URL(url).hostname}`]
        };
    }

    extractRecipeNameFromUrl(url) {
        try {
            const urlPath = new URL(url).pathname;
            const parts = urlPath.split('/').filter(p => p.length > 0);
            const lastPart = parts[parts.length - 1] || parts[parts.length - 2] || '';
            
            let name = lastPart
                .replace(/przepis|recipe|-html|-php/gi, '')
                .replace(/-|_/g, ' ')
                .split(' ')
                .filter(word => word.length > 0)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
                .trim();
            
            return name || 'Przepis';
        } catch (e) {
            return 'Przepis';
        }
    }

    extractImage(html, baseUrl) {
        const imagePatterns = [
            /"image":\s*"([^"]+)"/,
            /"image":\s*\[\s*"([^"]+)"/,
            /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/,
            /<img[^>]*class="[^"]*recipe[^"]*"[^>]*src="([^"]+)"/i,
            /<img[^>]*src="([^"]+)"[^>]*alt="[^"]*recipe[^"]*"/i
        ];

        for (const pattern of imagePatterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
                let imageUrl = match[1];
                
                if (imageUrl.startsWith('//')) {
                    imageUrl = 'https:' + imageUrl;
                } else if (imageUrl.startsWith('/')) {
                    const base = new URL(baseUrl);
                    imageUrl = base.protocol + '//' + base.host + imageUrl;
                }
                
                if (imageUrl.match(/\.(jpg|jpeg|png|webp|avif)(\?.*)?$/i) && 
                    !imageUrl.includes('placeholder') && 
                    !imageUrl.includes('default')) {
                    return imageUrl;
                }
            }
        }

        return null;
    }

    getDefaultImage(recipeName) {
        const lowerName = recipeName.toLowerCase();
        
        if (lowerName.includes('ciasto') || lowerName.includes('cake')) {
            return 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop';
        } else if (lowerName.includes('sałatka') || lowerName.includes('salad')) {
            return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop';
        } else if (lowerName.includes('zupa') || lowerName.includes('soup')) {
            return 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&h=300&fit=crop';
        }
        
        return 'https://images.unsplash.com/photo-1546548970-71785318a17b?w=400&h=300&fit=crop';
    }

    cleanHtmlForAI(html) {
        let cleaned = html
            .replace(/<script[^>]*>.*?<\/script>/gis, '')
            .replace(/<style[^>]*>.*?<\/style>/gis, '')
            .replace(/<nav[^>]*>.*?<\/nav>/gis, '')
            .replace(/<footer[^>]*>.*?<\/footer>/gis, '')
            .replace(/<header[^>]*>.*?<\/header>/gis, '')
            .replace(/<!--.*?-->/gs, '')
            .replace(/<meta[^>]*>/gi, '')
            .replace(/<link[^>]*>/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        return cleaned.substring(0, 8000);
    }

    extractArray(arr) {
        if (!Array.isArray(arr)) return [];
        
        return arr.map(item => {
            let text = '';
            if (typeof item === 'string') {
                text = item;
            } else if (item.text) {
                text = item.text;
            } else if (item.name) {
                text = item.name;
            } else {
                text = String(item);
            }
            
            return this.cleanText(text);
        }).filter(item => item.length > 0);
    }

    parseDuration(duration) {
        if (!duration) return null;
        
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
        if (match) {
            const hours = parseInt(match[1] || '0');
            const minutes = parseInt(match[2] || '0');
            
            const parts = [];
            if (hours > 0) parts.push(`${hours} godz`);
            if (minutes > 0) parts.push(`${minutes} min`);
            
            return parts.join(' ') || duration;
        }
        
        return duration;
    }

    cleanText(text) {
        if (!text) return '';
        
        // Decode HTML entities
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        let decoded = textarea.value;

        // Polish characters
        const polishChars = {
            '&oacute;': 'ó', '&#243;': 'ó', '&#xF3;': 'ó',
            '&aacute;': 'ą', '&#261;': 'ą', '&#x105;': 'ą',  
            '&eacute;': 'ę', '&#281;': 'ę', '&#x119;': 'ę',
            '&sacute;': 'ś', '&#347;': 'ś', '&#x15B;': 'ś',
            '&nacute;': 'ń', '&#324;': 'ń', '&#x144;': 'ń',
            '&cacute;': 'ć', '&#263;': 'ć', '&#x107;': 'ć',
            '&zacute;': 'ź', '&#378;': 'ź', '&#x17A;': 'ź',
            '&#322;': 'ł', '&#x142;': 'ł',
            '&#380;': 'ż', '&#x17C;': 'ż'
        };

        for (const [entity, char] of Object.entries(polishChars)) {
            decoded = decoded.replace(new RegExp(entity, 'gi'), char);
        }

        return decoded
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    updateExtractionStatus(message, type) {
        const status = document.getElementById('extractionStatus');
        status.textContent = message;
        status.className = `extraction-status ${type}`;
        status.classList.remove('hidden');
    }

    handleFormSubmit(e) {
        e.preventDefault();
        
        const name = document.getElementById('recipeName').value.trim();
        const prepTime = document.getElementById('prepTime').value.trim();
        const ingredientsText = document.getElementById('ingredients').value.trim();
        const instructionsText = document.getElementById('instructions').value.trim();
        const sourceUrl = document.getElementById('recipeUrl').value.trim();

        if (!name || !ingredientsText || !instructionsText) {
            this.showToast('Proszę wypełnić wszystkie wymagane pola!', 'error');
            return;
        }

        const ingredients = ingredientsText.split('\n').filter(item => item.trim());
        const instructions = instructionsText.split('\n').filter(item => item.trim());

        const recipe = {
            id: this.currentRecipeId || Date.now(),
            name,
            prepTime: prepTime || 'Nie podano',
            ingredients,
            instructions,
            source: sourceUrl || null,
            image: null,
            dateAdded: new Date().toISOString()
        };

        if (this.currentRecipeId) {
            // Update existing recipe
            const index = this.recipes.findIndex(r => r.id === this.currentRecipeId);
            if (index !== -1) {
                this.recipes[index] = { ...this.recipes[index], ...recipe };
            }
            this.showToast('✅ Przepis zaktualizowany!', 'success');
        } else {
            // Add new recipe
            this.recipes.push(recipe);
            this.showToast('✅ Przepis dodany!', 'success');
        }

        this.saveRecipes();
        this.clearForm();
        this.filteredRecipes = this.recipes;
        this.renderRecipes();
        this.showSection('recipes');
    }

    clearForm() {
        document.getElementById('recipeUrl').value = '';
        document.getElementById('recipeName').value = '';
        document.getElementById('prepTime').value = '';
        document.getElementById('ingredients').value = '';
        document.getElementById('instructions').value = '';
        document.getElementById('extractionStatus').classList.add('hidden');
        this.currentRecipeId = null;
    }

    renderRecipes() {
        const grid = document.getElementById('recipesGrid');
        const emptyState = document.getElementById('emptyState');

        if (this.recipes.length === 0) {
            grid.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        if (this.filteredRecipes.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <h3>Brak wyników</h3>
                    <p>Nie znaleziono przepisów pasujących do wyszukiwania</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.filteredRecipes.map(recipe => `
            <div class="recipe-card">
                <div class="recipe-card__image">
                    ${recipe.image ? 
                        `<img src="${recipe.image}" alt="${recipe.name}" onerror="this.style.display='none'; this.parentNode.innerHTML='🍳';">` : 
                        '🍳'
                    }
                </div>
                <div class="recipe-card__content">
                    <div class="recipe-card__header">
                        <h3 class="recipe-card__title" onclick="app.showRecipeModal(${recipe.id})">${recipe.name}</h3>
                        <span class="recipe-card__time">⏱️ ${recipe.prepTime}</span>
                    </div>
                    
                    <div class="recipe-card__meta">
                        <span>📋 ${recipe.ingredients.length} składników</span>
                        <span>👩‍🍳 ${recipe.instructions.length} kroków</span>
                    </div>
                    
                    <div class="recipe-card__preview">
                        <h4>Składniki:</h4>
                        <ul class="recipe-card__list">
                            ${recipe.ingredients.slice(0, 3).map(ingredient => `<li>${ingredient}</li>`).join('')}
                            ${recipe.ingredients.length > 3 ? `<li><em>...i ${recipe.ingredients.length - 3} więcej</em></li>` : ''}
                        </ul>
                    </div>
                    
                    <div class="recipe-card__actions">
                        <button class="btn btn--primary btn" onclick="app.showRecipeModal(${recipe.id})">
                            👁️ Zobacz
                        </button>
                        <button class="btn btn--secondary btn" onclick="app.editRecipe(${recipe.id})">
                            ✏️ Edytuj
                        </button>
                        <button class="btn btn--danger btn" onclick="app.deleteRecipe(${recipe.id})">
                            🗑️ Usuń
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    showRecipeModal(id) {
        const recipe = this.recipes.find(r => r.id === id);
        if (!recipe) return;

        this.currentRecipeId = id;
        
        const modal = document.getElementById('recipeModal');
        const title = document.getElementById('modalTitle');
        const body = document.getElementById('modalBody');

        title.textContent = recipe.name;

        body.innerHTML = `
            <div class="recipe-modal-image">
                ${recipe.image ? 
                    `<img src="${recipe.image}" alt="${recipe.name}" onerror="this.style.display='none'; this.parentNode.innerHTML='🍳';">` : 
                    '🍳'
                }
            </div>
            
            <div class="recipe-modal-meta">
                <div class="recipe-modal-meta-item">
                    <span class="recipe-modal-meta-value">⏱️ ${recipe.prepTime}</span>
                    <div class="recipe-modal-meta-label">Czas przygotowania</div>
                </div>
                <div class="recipe-modal-meta-item">
                    <span class="recipe-modal-meta-value">📋 ${recipe.ingredients.length}</span>
                    <div class="recipe-modal-meta-label">Składników</div>
                </div>
                <div class="recipe-modal-meta-item">
                    <span class="recipe-modal-meta-value">👩‍🍳 ${recipe.instructions.length}</span>
                    <div class="recipe-modal-meta-label">Kroków</div>
                </div>
            </div>

            ${recipe.source ? `
                <div class="recipe-source">
                    <a href="${recipe.source}" target="_blank">🔗 Zobacz oryginalny przepis</a>
                </div>
            ` : ''}

            <div class="recipe-modal-section">
                <h3>📋 Składniki</h3>
                <ul class="recipe-modal-ingredients">
                    ${recipe.ingredients.map(ingredient => `<li>${ingredient}</li>`).join('')}
                </ul>
            </div>

            <div class="recipe-modal-section">
                <h3>👩‍🍳 Instrukcje przygotowania</h3>
                <ol class="recipe-modal-instructions">
                    ${recipe.instructions.map(instruction => `<li>${instruction}</li>`).join('')}
                </ol>
            </div>
        `;

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    hideModal() {
        document.getElementById('recipeModal').classList.add('hidden');
        document.body.style.overflow = '';
        this.currentRecipeId = null;
    }

    editRecipe(id) {
        const recipe = this.recipes.find(r => r.id === id);
        if (!recipe) return;

        this.currentRecipeId = id;
        
        document.getElementById('recipeName').value = recipe.name;
        document.getElementById('prepTime').value = recipe.prepTime;
        document.getElementById('ingredients').value = recipe.ingredients.join('\n');
        document.getElementById('instructions').value = recipe.instructions.join('\n');
        document.getElementById('recipeUrl').value = recipe.source || '';

        this.showSection('add');
    }

    editCurrentRecipe() {
        this.hideModal();
        this.editRecipe(this.currentRecipeId);
    }

    deleteRecipe(id) {
        if (confirm('Czy na pewno chcesz usunąć ten przepis?')) {
            this.recipes = this.recipes.filter(recipe => recipe.id !== id);
            this.saveRecipes();
            this.filteredRecipes = this.recipes;
            this.renderRecipes();
            this.showToast('🗑️ Przepis usunięty', 'success');
        }
    }

    deleteCurrentRecipe() {
        this.hideModal();
        this.deleteRecipe(this.currentRecipeId);
    }

    async runScraperTests() {
        const testResults = document.getElementById('testResults');
        const runBtn = document.getElementById('runTests');
        const btnText = runBtn.querySelector('.btn-text');
        const btnLoading = runBtn.querySelector('.btn-loading');

        runBtn.disabled = true;
        btnText.classList.add('hidden');
        btnLoading.classList.remove('hidden');

        testResults.innerHTML = '';
        testResults.classList.remove('hidden');

        const testNames = [
            'Zupa z pieczonych warzyw',
            'Carpaccio figowe',
            'Curry z dynią i ciecierzycą',
            'Niewidzialne ciasto z jabłkami'
        ];

        for (let i = 0; i < this.testUrls.length; i++) {
            const url = this.testUrls[i];
            const name = testNames[i];
            
            const testCard = document.createElement('div');
            testCard.className = 'test-result testing';
            testCard.innerHTML = `
                <div class="test-result-header">
                    <h3>Test ${i + 1}: ${name}</h3>
                    <span class="status status--warning">🧪 Testowanie...</span>
                </div>
                <div class="card__body">
                    <div class="test-result-url">${url}</div>
                    <div class="test-result-logs" id="logs-${i}">
                        <div class="log-entry info">Rozpoczynam test...</div>
                    </div>
                </div>
            `;
            
            testResults.appendChild(testCard);
            
            try {
                const startTime = Date.now();
                const recipe = await this.extractRecipe(url);
                const duration = Date.now() - startTime;
                
                testCard.className = 'test-result success';
                testCard.querySelector('.status').innerHTML = '✅ Sukces';
                testCard.querySelector('.status').className = 'status status--success';
                
                const logs = document.getElementById(`logs-${i}`);
                logs.innerHTML += `
                    <div class="log-entry">✅ Przepis wyodrębniony pomyślnie!</div>
                    <div class="log-entry">⏱️ Czas: ${(duration/1000).toFixed(1)}s</div>
                    <div class="log-entry">📋 Składniki: ${recipe.ingredients.length}</div>
                    <div class="log-entry">👩‍🍳 Instrukcje: ${recipe.instructions.length}</div>
                `;
                
            } catch (error) {
                testCard.className = 'test-result error';
                testCard.querySelector('.status').innerHTML = '❌ Błąd';
                testCard.querySelector('.status').className = 'status status--danger';
                
                const logs = document.getElementById(`logs-${i}`);
                logs.innerHTML += `<div class="log-entry error">❌ ${error.message}</div>`;
            }
        }

        runBtn.disabled = false;
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 4000);
    }

    loadRecipes() {
        try {
            const saved = localStorage.getItem('recipeBook');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    }

    saveRecipes() {
        try {
            localStorage.setItem('recipeBook', JSON.stringify(this.recipes));
        } catch (e) {
            console.error('Error saving recipes:', e);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new RecipeBookApp();
});