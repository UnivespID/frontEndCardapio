// Selecionando elementos
const addToCartBtns = document.querySelectorAll('.add-to-cart-btn');
const cartBtn = document.getElementById('cart-btn');
const cartModal = document.getElementById('cart-modal');
const cartItemsContainer = document.getElementById('cart-items');
const cartCount = document.getElementById('cart-count');
const cartTotal = document.getElementById('cart-total');
const addressInput = document.getElementById('address');
const addressWarn = document.getElementById('address-warn');
const deliveryRadios = document.querySelectorAll('input[name="delivery-type"]');
const addressContainer = document.getElementById('address-container');
const checkoutBtn = document.getElementById('checkout-btn');
const checkoutText = document.getElementById('checkout-text');
const checkoutSpinner = document.getElementById('checkout-spinner');
const closeModalBtn = document.getElementById('close-modal-btn');

let cart = [];

let visitorId = localStorage.getItem('visitorId');
if (!visitorId) {
  visitorId = crypto.randomUUID?.() || ('v-' + Date.now());
  localStorage.setItem('visitorId', visitorId);
}

let lastFocusedElement = null;
let modalKeydownHandler = null;

function formatCurrency(value) {
  // Garantir duas casas decimais com vírgula opcional, usar ponto como no site original R$ 0.00
  return value.toFixed(2);
}

function updateCart() {
  cartItemsContainer.innerHTML = '';

  cart.forEach((item, index) => {
    const div = document.createElement('div');
    div.classList.add('flex', 'items-center', 'justify-between', 'border-b', 'py-2');
    div.setAttribute('role', 'listitem');
    div.innerHTML = `
      <div>
        <p><span class="font-bold">${escapeHtml(item.name)}</span> <span class="text-sm text-gray-500">× ${item.quantity}</span></p>
      </div>
      <div class="flex items-center gap-4">
        <p class="font-semibold">R$ ${formatCurrency(item.price * item.quantity)}</p>
        <button class="text-red-500 hover:text-red-700 font-bold remove-item-btn" data-index="${index}" aria-label="Remover ${escapeHtml(item.name)} do carrinho">Remover</button>
      </div>
    `;
    cartItemsContainer.appendChild(div);
  });

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (cartTotal) {
    cartTotal.textContent = `R$ ${formatCurrency(total)}`;
  }

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  if (cartCount) {
    cartCount.textContent = totalItems;
    // aria-live já pode existir no HTML; garantir atualização visível para leitores de tela
    cartCount.setAttribute('aria-live', 'polite');
  }

  // Delegação simples: adicionar listener a cada botão de remover
  const removeBtns = cartItemsContainer.querySelectorAll('.remove-item-btn');
  removeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const index = Number(btn.getAttribute('data-index'));
      if (!Number.isNaN(index)) {
        cart.splice(index, 1);
        updateCart();
      }
    });
  });
}

addToCartBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const name = btn.getAttribute('data-name');
    const price = parseFloat(btn.getAttribute('data-price'));

    const existingItem = cart.find(item => item.name === name);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ name, price, quantity: 1 });
    }

    updateCart();
    // Notificar leitor de tela que item foi adicionado
    announceForA11y(`${name} adicionado ao carrinho`);
  });
});

// Função utilitária para anúncio para leitores de tela (aria-live fallback)
function announceForA11y(message) {
  let live = document.getElementById('a11y-live-region');
  if (!live) {
    live = document.createElement('div');
    live.id = 'a11y-live-region';
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    live.className = 'sr-only';
    document.body.appendChild(live);
  }
  live.textContent = message;
}

// Função para escapar conteúdo inserido no DOM
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Acessibilidade do modal: abrir / fechar, trap de foco e atributos ARIA
const mainContent = document.getElementById('main-content') || document.getElementById('food-menu') || document.querySelector('main');

function getFocusableElements(container) {
  const selectors = [
    'a[href]',
    'area[href]',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'button:not([disabled])',
    'iframe',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ];
  return Array.from(container.querySelectorAll(selectors.join(','))).filter(el => el.offsetParent !== null);
}

function openModal() {
  if (!cartModal) return;
  lastFocusedElement = document.activeElement;
  cartModal.classList.remove('hidden');
  cartModal.setAttribute('aria-hidden', 'false');
  if (cartBtn) cartBtn.setAttribute('aria-expanded', 'true');
  if (mainContent) mainContent.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = 'hidden';

  // Focus no primeiro elemento focável dentro do modal
  const focusables = getFocusableElements(cartModal);
  const firstFocusable = focusables[0] || closeModalBtn || cartModal;
  firstFocusable.focus();

  // Keydown handler para trap focus e fechar com Esc
  modalKeydownHandler = function (e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    } else if (e.key === 'Tab') {
      // trap focus
      const focusList = getFocusableElements(cartModal);
      if (focusList.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusList[0];
      const last = focusList[focusList.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  document.addEventListener('keydown', modalKeydownHandler);

  // clique fora do dialog fecha (overlay)
  cartModal.addEventListener('click', overlayClickHandler);
}

function closeModal() {
  if (!cartModal) return;
  cartModal.classList.add('hidden');
  cartModal.setAttribute('aria-hidden', 'true');
  if (cartBtn) cartBtn.setAttribute('aria-expanded', 'false');
  if (mainContent) mainContent.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = '';
  document.removeEventListener('keydown', modalKeydownHandler);
  cartModal.removeEventListener('click', overlayClickHandler);
  // Retornar foco ao elemento anterior
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
  } else if (cartBtn) {
    cartBtn.focus();
  }
}

function overlayClickHandler(e) {
  // fechar ao clicar no overlay (fora do painel interno)
  if (e.target === cartModal) {
    closeModal();
  }
}

// Atachar handlers de abrir/fechar
if (cartBtn) {
  cartBtn.addEventListener('click', () => {
    openModal();
  });
}
if (closeModalBtn) {
  closeModalBtn.addEventListener('click', () => {
    closeModal();
  });
}

// Permitir mudança do container de endereço quando trocar opção
deliveryRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    if (radio.value === 'entrega') {
      addressContainer.style.display = 'block';
    } else {
      addressContainer.style.display = 'none';
      if (addressWarn) addressWarn.classList.add('hidden');
    }
  });
});

checkoutBtn.addEventListener('click', async () => {
  const deliveryType = document.querySelector('input[name="delivery-type"]:checked')?.value;

  if (!deliveryType) {
    alert('Escolha entrega, retirada ou contato!');
    return;
  }

  if (cart.length === 0) {
    alert('Adicione pelo menos um item ao carrinho');
    return;
  }

  // --- Montar resumo do pedido ---
  let message = "Olá, gostaria de fazer um pedido:%0A%0A";
  cart.forEach(item => {
    message += `- ${item.name} x${item.quantity} = R$ ${(item.price * item.quantity).toFixed(2)}%0A`;
  });
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2);
  message += `%0ATotal: R$ ${total}%0A`;

  // --- Caso seja CONTATO: abrir WhatsApp direto ---
  if (deliveryType === 'contato') {
    message += `%0AModo de contato: WhatsApp`;
    window.open(`https://wa.me/5511982797430?text=${message}`, '_blank');
    return;
  }

  // --- Caso seja ENTREGA: exigir endereço e incluir no resumo ---
  if (deliveryType === 'entrega') {
    if (!addressInput || addressInput.value.trim() === '') {
      if (addressWarn) addressWarn.classList.remove('hidden');
      addressInput?.focus();
      return;
    } else {
      if (addressWarn) addressWarn.classList.add('hidden');
    }
    message += `%0AModo de entrega: Entrega%0AEndereço: ${encodeURIComponent(addressInput.value.trim())}`;
  } else {
    // retirada
    message += `%0AModo de entrega: Retirada no local`;
  }

  // Agora abre no Whats e envia ao backend
  window.open(`https://wa.me/5511982797430?text=${message}`, '_blank');

  const orderData = {
    visitorId,
    cartItems: cart,
    address: deliveryType === 'entrega' ? addressInput.value.trim() : null
  };

  checkoutBtn.disabled = true;
  closeModalBtn.disabled = true;
  checkoutText.textContent = "Enviando...";
  checkoutSpinner.classList.remove('hidden');

  try {
    const response = await fetch('https://cardapiobackendunivesp.onrender.com/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });

    const result = await response.json();

    if (result.success) {
      alert('Pedido enviado com sucesso! O seu pedido tem o ID: ' + result.id);
      cart = [];
      updateCart();
      closeModal();
      if (addressInput) addressInput.value = '';
    } else {
      alert(result.message || 'Você já realizou um pedido anteriormente!');
    }
  } catch (err) {
    console.error(err);
    alert('Erro na conexão com o servidor!');
  } finally {
    checkoutBtn.disabled = false;
    closeModalBtn.disabled = false;
    checkoutText.textContent = "Finalizar pedido";
    checkoutSpinner.classList.add('hidden');
  }
});

// Inicializar UI
updateCart();

// Permitir fechar modal com Escape se estiver aberto (fallback)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && cartModal && !cartModal.classList.contains('hidden')) {
    closeModal();
  }
});