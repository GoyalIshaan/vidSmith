import { useEffect } from "react";

export const usePageTitle = (title: string) => {
  useEffect(() => {
    const baseTitle = "Vidsmith";
    document.title = title ? `${title} | ${baseTitle}` : baseTitle;

    return () => {
      document.title = baseTitle;
    };
  }, [title]);
};

export default usePageTitle;
