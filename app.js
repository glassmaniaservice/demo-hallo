/**
 * KotoBlog (コトブログ) - Core Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const rawInput = document.getElementById('rawInput');
  const inputCharCount = document.getElementById('inputCharCount');
  const micBtn = document.getElementById('micBtn');
  const micText = document.getElementById('micText');
  const sampleTextBtn = document.getElementById('sampleTextBtn');
  const clearInputBtn = document.getElementById('clearInputBtn');
  const sampleRefBtn = document.getElementById('sampleRefBtn');
  const referenceBlogInput = document.getElementById('referenceBlogInput');
  const targetAudience = document.getElementById('targetAudience');
  const articleLength = document.getElementById('articleLength');
  const generateBtn = document.getElementById('generateBtn');

  // Output Elements
  const outputEmptyState = document.getElementById('outputEmptyState');
  const outputLoadingState = document.getElementById('outputLoadingState');
  const loadingStatusText = document.getElementById('loadingStatusText');
  const outputContentArea = document.getElementById('outputContentArea');
  const outputActionsBar = document.getElementById('outputActionsBar');
  const outputStats = document.getElementById('outputStats');
  const articleCharCount = document.getElementById('articleCharCount');
  const readTime = document.getElementById('readTime');
  const articlePreviewBody = document.getElementById('articlePreviewBody');
  const titleList = document.getElementById('titleList');
  const tagsList = document.getElementById('tagsList');
  const seoDescription = document.getElementById('seoDescription');

  // Copy Buttons
  const copyMarkdownBtn = document.getElementById('copyMarkdownBtn');
  const copyHtmlBtn = document.getElementById('copyHtmlBtn');
  const copyTextBtn = document.getElementById('copyTextBtn');

  // Theme & Settings Modal
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const apiSettingsBtn = document.getElementById('apiSettingsBtn');
  const apiModal = document.getElementById('apiModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
  const clearApiKeyBtn = document.getElementById('clearApiKeyBtn');
  const geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
  const modelSelect = document.getElementById('modelSelect');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');

  // Reading Controls (Font Size & Fullscreen)
  const fontSizeBtns = document.querySelectorAll('.btn-font-size');
  const fullscreenPreviewBtn = document.getElementById('fullscreenPreviewBtn');
  const outputPanel = document.querySelector('.output-panel');

  fontSizeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      fontSizeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const size = btn.getAttribute('data-size');
      articlePreviewBody.classList.remove('font-size-sm', 'font-size-md', 'font-size-lg');
      articlePreviewBody.classList.add(`font-size-${size}`);
    });
  });

  if (fullscreenPreviewBtn) {
    fullscreenPreviewBtn.addEventListener('click', () => {
      outputPanel.classList.toggle('fullscreen-active');
      const isFull = outputPanel.classList.contains('fullscreen-active');
      fullscreenPreviewBtn.innerHTML = isFull ? '<i class="fa-solid fa-compress"></i>' : '<i class="fa-solid fa-expand"></i>';
      fullscreenPreviewBtn.title = isFull ? '縮小' : '全画面で読む';
    });
  }

  // Tone Cards
  const toneCards = document.querySelectorAll('.tone-card');
  let selectedTone = 'note';

  // Generated State
  let currentGeneratedData = {
    title: '',
    alternativeTitles: [],
    tags: [],
    seoDesc: '',
    markdown: '',
    html: ''
  };

  // -------------------------------------------------------------
  // 1. Initial State & Storage Load
  // -------------------------------------------------------------
  const savedApiKey = localStorage.getItem('kotoblog_gemini_key') || '';
  const savedModel = localStorage.getItem('kotoblog_gemini_model') || 'gemini-1.5-flash';
  const savedTheme = localStorage.getItem('kotoblog_theme') || 'light';

  geminiApiKeyInput.value = savedApiKey;
  modelSelect.value = savedModel;
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  // -------------------------------------------------------------
  // 2. Event Listeners: Tone Selector
  // -------------------------------------------------------------
  toneCards.forEach(card => {
    card.addEventListener('click', () => {
      toneCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        selectedTone = radio.value;
      }
    });
  });

  // Input Character Counter
  rawInput.addEventListener('input', () => {
    inputCharCount.textContent = `${rawInput.value.length} 文字`;
  });

  // Clear Input
  clearInputBtn.addEventListener('click', () => {
    rawInput.value = '';
    inputCharCount.textContent = '0 文字';
    rawInput.focus();
  });

  // Sample Talk Text
  sampleTextBtn.addEventListener('click', () => {
    rawInput.value = `先週から朝活として30分の散歩を始めてみたんだけど、これが予想以上に生活の質を爆上げしてくれたからシェアしたい！
もともと朝起きるの本当に苦手でいつもギリギリまで寝てたんだけど、日光浴びながら好きな音楽聴いて歩くだけで、午前中の集中力が段違いになった。
しかも夜もぐっすり眠れるようになって、1日のだるさが激減した感じ。
最初は「たった30分歩くだけで何か変わるの？」って半信半疑だったけど、道具もお金もいらないし誰でもすぐできるから、仕事で疲れてる人にこそ試してほしいな〜。
続けるコツは無理に早起きしようとせず、起きられた時間からでOKってハードルを下げること！`;
    inputCharCount.textContent = `${rawInput.value.length} 文字`;
    showToast('サンプル文章を入力しました💡');
  });

  // Sample Reference Blog
  sampleRefBtn.addEventListener('click', () => {
    referenceBlogInput.value = `こんにちは、みかんです🍊

最近、なんだか毎日バタバタしていませんか？
私も先週まで仕事に追われて「あぁ〜もう無理！」ってなっていました（笑）

そんな時にふと立ち止まってやってみた「小さな習慣」が、想像以上に心を軽くしてくれたんです。

今日は、私が実際にやってみて本当に救われた「3つのこと」をゆるっとシェアしますね☕️

少しでも誰かの心がフッと軽くなったら嬉しいです。
それでは、どうぞ〜！`;
    showToast('参考ブログの文体をセットしました✨');
  });

  // -------------------------------------------------------------
  // 3. Web Speech API (Voice Input)
  // -------------------------------------------------------------
  let recognition = null;
  let isRecording = false;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        rawInput.value += finalTranscript;
        inputCharCount.textContent = `${rawInput.value.length} 文字`;
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      stopVoiceRecording();
      if (event.error === 'not-allowed') {
        showToast('マイクの使用が許可されていません');
      }
    };

    recognition.onend = () => {
      if (isRecording) {
        recognition.start(); // Auto-restart if still recording
      } else {
        stopVoiceRecording();
      }
    };

    micBtn.addEventListener('click', () => {
      if (!isRecording) {
        startVoiceRecording();
      } else {
        stopVoiceRecording();
      }
    });
  } else {
    micBtn.style.display = 'none'; // Not supported
  }

  function startVoiceRecording() {
    try {
      recognition.start();
      isRecording = true;
      micBtn.classList.add('recording');
      micText.textContent = '音声録音中... (タップで停止)';
      showToast('マイクに向かってお話しください🎙️');
    } catch (e) {
      console.error(e);
    }
  }

  function stopVoiceRecording() {
    isRecording = false;
    micBtn.classList.remove('recording');
    micText.textContent = '音声入力';
    if (recognition) {
      recognition.stop();
    }
  }

  // -------------------------------------------------------------
  // 4. Tab View Switching
  // -------------------------------------------------------------
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabViews = document.querySelectorAll('.tab-view');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      tabBtns.forEach(b => b.classList.remove('active'));
      tabViews.forEach(v => v.classList.remove('active'));

      btn.classList.add('active');
      if (targetTab === 'preview') document.getElementById('viewPreview').classList.add('active');
      if (targetTab === 'seo') document.getElementById('viewSeo').classList.add('active');
    });
  });

  // -------------------------------------------------------------
  // 5. Blog Generation Engine
  // -------------------------------------------------------------
  generateBtn.addEventListener('click', async () => {
    const rawText = rawInput.value.trim();
    if (!rawText) {
      showToast('⚠️ 話し言葉やメモを入力してください');
      rawInput.focus();
      return;
    }

    outputEmptyState.style.display = 'none';
    if (outputContentArea) outputContentArea.style.display = 'none';
    if (outputActionsBar) outputActionsBar.style.display = 'none';
    if (outputStats) outputStats.style.display = 'none';
    if (outputLoadingState) outputLoadingState.style.display = 'flex';

    const refText = referenceBlogInput.value.trim();
    const audience = targetAudience.value.trim() || 'ブログ読者';
    const lengthOption = articleLength.value;
    const apiKey = (localStorage.getItem('kotoblog_gemini_key') || '').trim();
    const model = localStorage.getItem('kotoblog_gemini_model') || 'gemini-1.5-flash';

    let resultData = null;

    try {
      if (apiKey && apiKey.length > 20) {
        try {
          loadingStatusText.textContent = 'Gemini AIが文体を解析して記事を執筆中...';
          resultData = await generateWithGemini({ apiKey, model, rawText, refText, tone: selectedTone, audience, lengthOption });
        } catch (apiErr) {
          console.warn('Gemini API error, using smart local engine:', apiErr);
          loadingStatusText.textContent = 'スマート変換エンジンで記事を構成中...';
          resultData = generateWithLocalEngine({ rawText, refText, tone: selectedTone, audience, lengthOption });
          showToast('💡 内蔵スマート変換エンジンで記事を作成しました');
        }
      } else {
        loadingStatusText.textContent = 'スマート変換エンジンで記事を構成中...';
        await new Promise(r => setTimeout(r, 400));
        resultData = generateWithLocalEngine({ rawText, refText, tone: selectedTone, audience, lengthOption });
      }

      if (!resultData || !resultData.markdown) {
        resultData = generateWithLocalEngine({ rawText, refText, tone: selectedTone, audience, lengthOption });
      }

      renderGeneratedResult(resultData);
      triggerConfetti();
      showToast('🎉 ブログ記事が完成しました！');
    } catch (err) {
      console.error('Fatal error:', err);
      const fallbackData = generateWithLocalEngine({ rawText, refText, tone: selectedTone, audience, lengthOption });
      renderGeneratedResult(fallbackData);
      showToast('🎉 ブログ記事が完成しました！');
    }
  });

  // -------------------------------------------------------------
  // 6. Gemini API Generator
  // -------------------------------------------------------------
  async function generateWithGemini({ apiKey, model, rawText, refText, tone, audience, lengthOption }) {
    let tonePromptDesc = '';
    if (tone === 'note') tonePromptDesc = 'noteやエッセイのような、共感を呼びかける優しく語りかけるトーン。語尾は「〜ですね」「〜かもしれません」など。';
    if (tone === 'casual') tonePromptDesc = '親しみやすいカジュアルなブログトーン。適度な絵文字を含み、ワクワクする明るい話し言葉。';
    if (tone === 'business') tonePromptDesc = 'ビジネス・専門解説風。論理的で説得力のある「です・ます」調。結論ファーストで構造化。';
    if (tone === 'summary') tonePromptDesc = '要約・まとめ記事風。要点が見出しと箇条書きで即座に理解できる整理された構成。';

    let lengthInstruction = '1000〜1500文字程度';
    if (lengthOption === 'short') lengthInstruction = '600〜800文字程度でサクッと読める分量';
    if (lengthOption === 'long') lengthInstruction = '2000文字以上の充実した詳細な解説';

    let refPrompt = '';
    if (refText) {
      refPrompt = `
【最重要：参考ブログの文体模倣】
ユーザーから以下の「参考ブログ文章」が提供されています。
この参考ブログの以下の特徴を徹底的に分析し、全く同じスタイル・文体で執筆してください：
1. 挨拶や導入のテンポ・言い回し
2. 語尾のクセ（〜ですよね、〜なんです、〜だなぁ等）
3. 改行やスペースの使い方、リズム
4. 絵文字や記号の使い方
5. 読者への呼びかけ方や距離感

--- 参考ブログ文章 開始 ---
${refText}
--- 参考ブログ文章 終了 ---
`;
    }

    const systemPrompt = `
あなたはプロの人気ブロガー兼編集者です。
ユーザーから提供された「話し言葉・音声文字起こし・雑なメモ」をもとに、読者が引き込まれる魅力的なブログ記事を作成してください。

【基本設定】
- 想定読者: ${audience}
- 基本トーン: ${tonePromptDesc}
- 目安文字数: ${lengthInstruction}
${refPrompt}

【出力フォーマット】
以下のJSONフォーマットのみを返してください。Markdownコードブロック(\`\`\`json ... \`\`\`)で囲んで出力してください。

{
  "mainTitle": "最もおすすめのキャッチーな記事タイトル",
  "alternativeTitles": ["タイトル候補2", "タイトル候補3", "タイトル候補4", "タイトル候補5"],
  "tags": ["タグ1", "タグ2", "タグ3", "タグ4"],
  "seoDescription": "記事の要約・メタディスクリプション（80〜120文字程度）",
  "markdownBody": "# タイトル\\n\\n## 導入\\n...\\n\\n## 見出し1\\n...\\n\\n## 見出し2\\n...\\n\\n## まとめ\\n..."
}
`;

    const userPrompt = `以下の話し言葉・メモからブログ記事を作成してください：\n\n${rawText}`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: systemPrompt + '\n\n' + userPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `APIリクエストに失敗しました (Status: ${response.status})`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error('AIからの応答を取得できませんでした。');

    // Parse JSON
    let cleanJson = content.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleanJson);
    return {
      title: parsed.mainTitle,
      alternativeTitles: parsed.alternativeTitles || [],
      tags: parsed.tags || [],
      seoDesc: parsed.seoDescription || '',
      markdown: parsed.markdownBody || ''
    };
  }

  // -------------------------------------------------------------
  // 7. Local Intelligent Fallback Engine (No API Key Required)
  // -------------------------------------------------------------
  function generateWithLocalEngine({ rawText, refText, tone, audience, lengthOption }) {
    // Extract key sentences & topic
    const lines = rawText.split(/[。\n！？!?]+/).map(s => s.trim()).filter(s => s.length > 0);
    const mainTopic = lines[0] || '今日の気付き';
    
    // Tone suffix definitions
    let ending = 'です。';
    let greeting = 'こんにちは！今回は最近感じたことについてシェアします。';
    let closing = 'ぜひみなさんも試してみてくださいね！';
    let emoji = '✨';

    if (tone === 'note') {
      ending = 'ですね。';
      greeting = `日々の暮らしの中でふと立ち止まったときに、大切にしたい気づきがありました。`;
      closing = '最後まで読んでくださり、ありがとうございました。何かひとつでもヒントになれば幸いです🌿';
      emoji = '🌿';
    } else if (tone === 'casual') {
      ending = 'だよ〜！';
      greeting = `こんにちは！今日は最近やってみて「これ最高じゃん！」ってなったお話をシェアします🎉`;
      closing = '気になったらぜひやってみてね！感想もお待ちしてます🙌';
      emoji = '🎉';
    } else if (tone === 'business') {
      ending = 'となります。';
      greeting = `本記事では、生産性向上と日常の質を高めるための具体的な実践例と効果について解説します。`;
      closing = '本記事の内容が、日々の取り組みの参考となれば幸いです。';
      emoji = '📌';
    } else if (tone === 'summary') {
      ending = 'です。';
      greeting = `今回の要点をわかりやすくまとめました。`;
      closing = '以上、要点のまとめでした！';
      emoji = '💡';
    }

    // If reference text provided, adapt tone
    if (refText) {
      if (refText.includes('🍊') || refText.includes('☕️') || refText.includes('（笑）')) {
        greeting = 'こんにちは！今日もゆるっとお届けします☕️\n\n' + greeting;
        closing = '少しでも誰かのヒントになったら嬉しいです。\nそれではまた〜！';
        emoji = '☕️';
      }
    }

    // Build structured sections
    const title = `【実践レポ】${mainTopic.slice(0, 24)}が想像以上に良かった話`;
    
    let section1Body = '';
    let section2Body = '';
    
    if (lines.length > 2) {
      section1Body = lines.slice(0, Math.ceil(lines.length / 2)).join('。\n') + '。';
      section2Body = lines.slice(Math.ceil(lines.length / 2)).join('。\n') + '。';
    } else {
      section1Body = `${rawText}\n\n最初は半信半疑だったのですが、実際にやってみると驚くほど効果を実感できました。`;
      section2Body = `特に良かったポイントは、特別な道具もいらずに今すぐ始められるところ${ending}\n日常に小さな変化を取り入れるだけで、気分も大きく変わります。`;
    }

    const markdown = `# ${title}

${greeting}

---

## 💡 はじめに：なぜこれを始めたのか？

${section1Body}

> 「日常のちょっとした行動を変えるだけで、これほど劇的な変化があるとは思いませんでした。」

## 🚀 実際にやってみて感じた具体的な効果

${section2Body}

### ✅ おすすめのポイント
- **手軽さ**: 特別な準備やお金がかからない
- **継続性**: 自分のペースで無理なく続けられる
- **実感**: 始めた初日から違いを実感できる

## 📝 続けるためのちょっとしたコツ

無理に完璧を目指さず、「まずは1回やってみる」「できたら自分を褒める」くらいの軽い気持ちで始めるのが継続の秘訣${ending}

## 🌿 まとめ

${closing}
`;

    return {
      title: title,
      alternativeTitles: [
        `もっと早く知りたかった！${mainTopic.slice(0, 18)}の魅力`,
        `【初心者向け】${mainTopic.slice(0, 16)}をやってみた結果と3つの変化`,
        `忙しいあなたへ贈る、日常を劇的に好転させる小さな習慣`,
        `【保存版】誰でも今すぐできる${mainTopic.slice(0, 14)}のコツまとめ`
      ],
      tags: ['ブログ', 'ライフハック', '体験談', '習慣化', 'おすすめ'],
      seoDesc: `${mainTopic.slice(0, 30)}についての体験談と実践して分かったメリット・継続のコツを分かりやすくまとめました。`,
      markdown: markdown
    };
  }

  // -------------------------------------------------------------
  // 8. Render Result & Statistics
  // -------------------------------------------------------------
  function renderGeneratedResult(data) {
    currentGeneratedData = {
      ...data,
      html: typeof marked !== 'undefined' ? marked.parse(data.markdown) : data.markdown
    };

    // Render Preview
    if (articlePreviewBody) {
      articlePreviewBody.innerHTML = currentGeneratedData.html;
    }

    // Render Stats
    const cleanContent = (currentGeneratedData.markdown || '').replace(/[#*\n\-\s]/g, '');
    const charLen = cleanContent.length;
    if (articleCharCount) articleCharCount.textContent = charLen.toLocaleString();
    if (readTime) readTime.textContent = Math.max(1, Math.ceil(charLen / 500));
    if (outputStats) outputStats.style.display = 'flex';

    // Render Titles
    if (titleList) {
      titleList.innerHTML = '';
      const allTitles = [data.title, ...(data.alternativeTitles || [])];
      allTitles.forEach(t => {
        if (!t) return;
        const div = document.createElement('div');
        div.className = 'title-item';
        div.innerHTML = `<span>${escapeHtml(t)}</span> <i class="fa-regular fa-copy"></i>`;
        div.addEventListener('click', () => {
          navigator.clipboard.writeText(t);
          showToast(`タイトルをコピー: 「${t}」`);
        });
        titleList.appendChild(div);
      });
    }

    // Render Tags
    if (tagsList) {
      tagsList.innerHTML = '';
      (data.tags || []).forEach(tag => {
        const span = document.createElement('span');
        span.className = 'tag-pill';
        span.textContent = `#${tag}`;
        tagsList.appendChild(span);
      });
    }

    // Render SEO Desc
    if (seoDescription) {
      seoDescription.textContent = data.seoDesc || '（ディスクリプションなし）';
    }

    // Show result views
    if (outputLoadingState) outputLoadingState.style.display = 'none';
    if (outputContentArea) outputContentArea.style.display = 'block';
    if (outputActionsBar) outputActionsBar.style.display = 'flex';
  }

  // -------------------------------------------------------------
  // 9. Copy Actions
  // -------------------------------------------------------------
  copyMarkdownBtn.addEventListener('click', () => {
    if (!currentGeneratedData.markdown) return;
    navigator.clipboard.writeText(currentGeneratedData.markdown);
    showToast('Markdownをコピーしました！📋');
  });

  copyHtmlBtn.addEventListener('click', () => {
    if (!currentGeneratedData.html) return;
    navigator.clipboard.writeText(currentGeneratedData.html);
    showToast('HTMLコードをコピーしました！🌐');
  });

  copyTextBtn.addEventListener('click', () => {
    if (!articlePreviewBody) return;
    navigator.clipboard.writeText(articlePreviewBody.innerText);
    showToast('プレーンテキストをコピーしました！📝');
  });

  // -------------------------------------------------------------
  // 10. API Settings Modal
  // -------------------------------------------------------------
  apiSettingsBtn.addEventListener('click', () => {
    apiModal.classList.add('active');
  });

  closeModalBtn.addEventListener('click', () => {
    apiModal.classList.remove('active');
  });

  apiModal.addEventListener('click', (e) => {
    if (e.target === apiModal) apiModal.classList.remove('active');
  });

  saveApiKeyBtn.addEventListener('click', () => {
    const key = geminiApiKeyInput.value.trim();
    const model = modelSelect.value;
    localStorage.setItem('kotoblog_gemini_key', key);
    localStorage.setItem('kotoblog_gemini_model', model);
    apiModal.classList.remove('active');
    showToast(key ? 'Gemini APIキーを保存しました🔑' : 'APIキーを未設定（内蔵エンジンで動作）');
  });

  clearApiKeyBtn.addEventListener('click', () => {
    geminiApiKeyInput.value = '';
    localStorage.removeItem('kotoblog_gemini_key');
    apiModal.classList.remove('active');
    showToast('APIキーを削除しました');
  });

  // -------------------------------------------------------------
  // 11. Theme Switcher
  // -------------------------------------------------------------
  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('kotoblog_theme', newTheme);
    updateThemeIcon(newTheme);
  });

  function updateThemeIcon(theme) {
    const icon = themeToggleBtn.querySelector('i');
    if (theme === 'dark') {
      icon.className = 'fa-solid fa-sun';
    } else {
      icon.className = 'fa-solid fa-moon';
    }
  }

  // -------------------------------------------------------------
  // 12. Utilities
  // -------------------------------------------------------------
  function showToast(message) {
    toastMessage.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  function triggerConfetti() {
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 }
      });
    }
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
