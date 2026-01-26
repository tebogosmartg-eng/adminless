import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from "@/components/ui/button";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from 'react';

export const ReloadPrompt = () => {
  const { toast } = useToast();
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  useEffect(() => {
    if (offlineReady) {
        toast({
            title: "App ready to work offline",
            description: "You can now use this app without an internet connection.",
            duration: 5000,
        });
        setOfflineReady(false);
    }
  }, [offlineReady, toast, setOfflineReady]);

  useEffect(() => {
    if (needRefresh) {
        toast({
            title: "New content available",
            description: "A new version of the app is available. Click reload to update.",
            action: (
                <ToastAction altText="Reload" onClick={() => updateServiceWorker(true)}>
                    Reload
                </ToastAction>
            ),
            duration: Infinity, 
        });
    }
  }, [needRefresh, toast, updateServiceWorker]);

  return null;
};