document.addEventListener('DOMContentLoaded', () => {
  // 各要素を取得
  let threadTitle = document.getElementById('thread-title');
  let chatContainer = document.getElementById('chat-container');
  let threadControls = document.getElementById('thread-controls');
  let threadsModal = document.getElementById('threads-modal');
  let closeThreadsBtn = document.getElementById('close-threads-btn');

  // UIを初期化する関数。
  // 各要素にイベントリスナーを設定し、
  // マークダウンを反映した後、チャットを最下部へスクロールする。
  function InitializeInterface() {
    if (document.getElementById('generation-form') && typeof handleFormSubmit === 'function') {
      document.getElementById('generation-form').addEventListener('submit', handleFormSubmit);
      const textarea = document.getElementById('generation-form').querySelector('textarea');
      textarea?.addEventListener('input', () => adjustTextareaHeight(textarea));
      textarea?.addEventListener('keydown', handleTextareaKeydown);
    }

    if (document.getElementById('show-threads-btn') && typeof fetchChatThreads === 'function') {
      document.getElementById('show-threads-btn').addEventListener('click', () => {
        fetchChatThreads();
        document.getElementById('threads-modal').style.display = 'flex';
      });
    }

    if (document.getElementById('close-threads-btn')) {
      document.getElementById('close-threads-btn').addEventListener('click', () => {
        document.getElementById('threads-modal').style.display = 'none';
      });
    }

    if (document.getElementById('threads-list') && typeof handleThreadSelection === 'function') {
      document.getElementById('threads-list').addEventListener('click', handleThreadSelection);
    }


    if (document.getElementById('new-thread-btn') && typeof createNewThread === 'function') {
      document.getElementById('new-thread-btn').addEventListener('click', createNewThread);
    }

    renderMarkdown();
    scrollToBottom();
  }

  // フォームの入力に以上がないか確かめる関数。
  // 空白文字以外が含まれていない場合はfalseを返す。
  function isValidInput(input) {
    return /\S/.test(input);
  }

  // Enterキーを押したときの動作を決める関数。
  // 日本語入力時の変換には反応しないようにしている。
  // 改行したい場合はShiftキーを同時押しすること。
  function handleTextareaKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      if (isValidInput(e.target.value)) {
        document.getElementById('generation-form').dispatchEvent(new Event('submit'));
      }
    }
  }

  // スレッドのタイトルを更新する関数。
  // スレッド新規作成時にはタイトルを表示する要素がないため、
  // 新たに作成する。
  function updateThreadTitleDisplay(title) {
    if (document.getElementById('thread-title')) {
      document.getElementById('thread-title').textContent = title;
    } else {
      const newTitleElement = document.createElement('h1');
      newTitleElement.id = 'thread-title';
      newTitleElement.textContent = title;
      document.body.insertBefore(newTitleElement, document.body.firstChild);
    }
  }

  // APIの返答をアニメーションする関数。
  // 返答を解析して5mm秒に1文字ずつ描画する。
  // コードブロックにはハイライト処理を施す。
  function displayResponse(text, container) {
    container.setAttribute('data-markdown', text);
    const htmlContent = marked.parse(text);
    let currentIndex = 0;
    
    const intervalId = setInterval(() => {
      if (currentIndex < htmlContent.length) {
        container.innerHTML = htmlContent.substring(0, currentIndex + 1);
        currentIndex++;
        scrollToBottom();
      } else {
        clearInterval(intervalId);
        container.querySelectorAll('pre code').forEach((block) => {
          hljs.highlightBlock(block);
        });
        scrollToBottom();
      }
    }, 5);
  }

  // チャットを最下部までスクロールする関数。
  // .chat-containerが存在する場合、
  // その高さを取得し、その分だけスクロールする。
  function scrollToBottom() {
    if (document.getElementById('chat-container')) {
      document.getElementById('chat-container').scrollTop = document.getElementById('chat-container').scrollHeight;
    }
  }

  // APIエラーを処理する関数。
  // エラーをコンソールに出力し、ユーザーにエラーメッセージを表示する。
  // エラーの詳細はコンソールでのみ確認可能。
  function handleAPIError(error, container) {
    console.error('APIリクエストが失敗しました', error);
    container.innerText = 'エラーが発生しました。';
  }

  // テキストをHTML用にフォーマットする関数。
  // 特殊文字をエスケープし、改行をHTMLの改行タグに変換する。
  // XSS攻撃を防ぐための安全な文字列処理を行う。
  function formatText(text) {
    const escapeHtml = (unsafe) => {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };
    return escapeHtml(text).replace(/\n/g, '<br>');
  }
  
  // チャット画面を更新する関数。
  // チャット画面を1度クリアし、新しいチャットUIを構築する。
  // 新しく構築したUIには、各種イベントリスナーを設定する。
  function updateChatInterface(chatThread, prompts) {
    const centerContainer = document.querySelector('.center-container');
    if (centerContainer) {
      centerContainer.remove();
    }

    if (!document.getElementById('thread-controls').querySelector('#new-thread-btn')) {
      const newThreadBtn = document.createElement('button');
      newThreadBtn.id = 'new-thread-btn';
      newThreadBtn.className = 'thread-control-btn';
      newThreadBtn.textContent = '+';
      newThreadBtn.addEventListener('click', createNewThread);
      document.getElementById('thread-controls').insertBefore(newThreadBtn, document.getElementById('thread-controls').firstChild);
    }

    document.body.innerHTML = '';

    const newHtml = `
      <pre style="display: none;">${chatThread.context || ''}</pre>
      <h1 id="thread-title">${chatThread.title || 'Untitled Thread'}</h1>
      <div id="thread-controls">
        <button id="new-thread-btn" class="thread-control-btn">+</button>
        <button id="show-threads-btn" class="thread-control-btn">❏</button>
      </div> 
      <div id="chat-container">
        <div id="messages-list"></div>
      </div>
      <form id="generation-form" action="/chat_threads/${chatThread.id}/prompts" data-remote="true">
        <div class="textarea-with-submit-inside">
          <textarea name="prompt[content]" class="rounded-corners"></textarea>
          <input type="submit" value="↑" class="submit-within-textarea rounded-corners">
        </div>
      </form>
      <div id="threads-modal">
      <div id="threads-modal-content">
        <button id="close-threads-btn">&times;</button>
        <h2 class="modal-title">スレッド一覧</h2>
        <div id="threads-list"></div>
      </div>
    </div>
    `;
    
    document.body.insertAdjacentHTML('afterbegin', newHtml);
    
    InitializeInterface();
    
    if (prompts && Array.isArray(prompts)) {
      prompts.forEach(prompt => {
        if (prompt.content) {
          appendPrompt(prompt.content, prompt.response);
        }
      });
    }
  }

  // プロンプトと返答を画面に追加する関数。
  // HTML要素を作成し、チャットのリストに追加する。
  function appendPrompt(content, response) {
    const promptElement = document.createElement('div');
    promptElement.innerHTML = `
      <div class="prompt-box">
        <p class="prompt">You:</p>
        <p class="prompt-text">${formatText(content)}</p>
      </div>
      <div class="response-box">
        <p class="response">GPT:</p>
        <p class="response-text" data-markdown>${response}</p>
      </div>
    `;
    document.getElementById('messages-list').appendChild(promptElement);
  }

  // テキストエリアのサイズを自動調整する関数。
  // 入力されたテキストの高さに合わせて変更する。
  function adjustTextareaHeight(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  // テキストエリアのサイズをリセットする関数。
  // テキストエリアの高さを初期値に戻す。
  function resetTextareaSize(textarea) {
    textarea.style.height = 'auto';
  }

  // マークダウンをレンダリングする関数。
  // data-markdown属性を持つ要素すべてに対して、
  // マークダウン形式のテキストをHTML形式に変換する。
  function renderMarkdown() {
    document.querySelectorAll('.response-text[data-markdown]').forEach(elem => {
      elem.innerHTML = marked.parse(elem.textContent);
    });
  }

  // スレッド一覧モーダルを非表示にする関数。
  // displayプロパティをnoneに設定してモーダルを閉じる。
  function hideThreadsModal() {
    document.getElementById('threads-modal').style.display = 'none';
  }

  InitializeInterface();

  // スレッドの一覧モーダルを非表示にする処理。
  window.addEventListener('click', (event) => {
    if (event.target === document.getElementById('threads-modal')) {
      document.getElementById('threads-modal').style.display = 'none';
    }
  });
});
