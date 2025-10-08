import { ref, onMounted, onUnmounted } from 'vue';

export function useKeyboard() {
  // どのキーが押されているかをリアクティブに管理する
  const keysPressed = ref({});

  function onKeyDown(event) {
    keysPressed.value[event.key.toLowerCase()] = true;
  }

  function onKeyUp(event) {
    keysPressed.value[event.key.toLowerCase()] = false;
  }

  // コンポーネントがマウントされた時にイベントリスナーを登録
  onMounted(() => {
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
  });

  // コンポーネントがアンマウントされた時にイベントリスナーを解除
  onUnmounted(() => {
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
  });

  // 押されているキーの状態を返す
  return {
    keysPressed,
  };
}
