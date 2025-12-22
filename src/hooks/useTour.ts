import { useState, useCallback } from "react";

const STORAGE_KEY = "esko_completed_tours";

export type TourId = "dashboard" | "account" | "events" | "gallery" | "eventDetail" | "statistics" | "routeDetail" | "notifications" | "memberProfile";

interface UseTourReturn {
  isRunning: boolean;
  currentTour: TourId | null;
  startTour: (tourId: TourId) => void;
  endTour: () => void;
  isTourCompleted: (tourId: TourId) => boolean;
  markTourCompleted: (tourId: TourId) => void;
  resetAllTours: () => void;
  shouldAutoStart: (tourId: TourId) => boolean;
}

const getCompletedTours = (): TourId[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveCompletedTours = (tours: TourId[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tours));
};

export const useTour = (): UseTourReturn => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTour, setCurrentTour] = useState<TourId | null>(null);

  const startTour = useCallback((tourId: TourId) => {
    setCurrentTour(tourId);
    setIsRunning(true);
  }, []);

  const endTour = useCallback(() => {
    setIsRunning(false);
    setCurrentTour(null);
  }, []);

  const isTourCompleted = useCallback((tourId: TourId): boolean => {
    return getCompletedTours().includes(tourId);
  }, []);

  const markTourCompleted = useCallback((tourId: TourId) => {
    const completed = getCompletedTours();
    if (!completed.includes(tourId)) {
      saveCompletedTours([...completed, tourId]);
    }
  }, []);

  const resetAllTours = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const shouldAutoStart = useCallback((tourId: TourId): boolean => {
    const completed = getCompletedTours();
    const dismissedKey = `esko_tour_dismissed_${tourId}`;
    const dismissed = localStorage.getItem(dismissedKey);
    return !completed.includes(tourId) && !dismissed;
  }, []);

  return {
    isRunning,
    currentTour,
    startTour,
    endTour,
    isTourCompleted,
    markTourCompleted,
    resetAllTours,
    shouldAutoStart,
  };
};
