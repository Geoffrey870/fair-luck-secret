import { useState, useEffect } from 'react';
import { createInstance, initSDK, SepoliaConfig } from '@zama-fhe/relayer-sdk/bundle';

export function useZamaInstance() {
  const [instance, setInstance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initZama = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Wait for CDN script to load if needed
        if (typeof window !== 'undefined' && !(window as any).relayerSDK) {
          console.warn('FHE SDK CDN script not loaded, waiting...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          if (!(window as any).relayerSDK) {
            throw new Error('FHE SDK CDN script not loaded. Please check network connection and ensure the CDN script is included in index.html');
          }
        }

        console.log('Initializing FHE SDK...');
        await initSDK();
        console.log('FHE SDK initialized successfully');

        console.log('Creating FHE instance with SepoliaConfig...');
        const zamaInstance = await createInstance(SepoliaConfig);
        console.log('FHE instance created successfully');

        if (mounted) {
          setInstance(zamaInstance);
        }
      } catch (err: any) {
        console.error('Failed to initialize Zama instance:', err);
        console.error('Error details:', {
          name: err?.name,
          message: err?.message,
          stack: err?.stack
        });
        if (mounted) {
          setError(err?.message || 'Failed to initialize encryption service. Please refresh the page.');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initZama();

    return () => {
      mounted = false;
    };
  }, []);

  return { instance, isLoading, error };
}

