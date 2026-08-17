# Plano de Implementação - Etapa 07: Notification Overlay Lab

Criar um sistema de notificação mobile-first realista para uso em narrativas interativas, com suporte a gestos, áudio e estados explícitos.

## 1. Criação do Componente Reutilizável
- Criar `src/components/dev/NotificationOverlay.tsx`.
- Implementar estado explícito: `hidden | entering | visible | pressed | dismissing | dismissed`.
- Interface baseada em notificações modernas (frosted glass, safe area, mobile-first).
- Suporte a swipe manual (gesto para cima) para descartar.
- Suporte a `autoDismiss` com timer gerenciado no estado `visible`.
- Suporte a áudio via `soundSrc` com limpeza rigorosa.

## 2. Implementação da Rota de Laboratório
- Modificar `src/routes/dev/notification.tsx`.
- Painel de controle para editar: App Name, Sender, Message, Timestamp.
- Gerenciamento de arquivos locais (Avatar e SFX) via `URL.createObjectURL` com limpeza no `unmount` e substituição.
- Modo "Preview Fullscreen" com background fictício.
- Event Log e Debug Panel.

## 3. Detalhes Técnicos
- **Posicionamento**: `fixed top-0` com `safe-area-inset-top`.
- **Animações**: Transições suaves de opacidade e transform (slide-in discreto).
- **Acessibilidade**: Suporte a teclado e `prefers-reduced-motion`.
- **Independência**: O componente não conhecerá o `TimelineEngine` ou `MessagingOverlay`.

## 4. Estratégia de Limpeza
- `useEffect` para revogar Object URLs ao desmontar.
- Limpeza de `setTimeout` nos estados de animação e auto-dismiss.
- Reset de instâncias de áudio.

## 5. Verificação e Testes
- Validar disparos sucessivos (Teste H).
- Validar thresholds de swipe (Testes D e E).
- Validar autoplay de áudio condicional ao gesto de disparo (Teste F).
