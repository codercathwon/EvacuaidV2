import { useState, useCallback } from 'react';

export function useGeolocation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPosition = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const err = 'Geolocation is not supported by this browser.';
        setError(err);
        reject(new Error(err));
        return;
      }

      setLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLoading(false);
          resolve(position);
        },
        (err) => {
          setLoading(false);
          let errMsg = 'Failed to get location';
          if (err.code === err.PERMISSION_DENIED) errMsg = 'Location permission denied';
          if (err.code === err.POSITION_UNAVAILABLE) errMsg = 'Location information is unavailable';
          if (err.code === err.TIMEOUT) errMsg = 'Location request timed out';
          setError(errMsg);
          reject(new Error(errMsg));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  return { getPosition, loading, error };
}
