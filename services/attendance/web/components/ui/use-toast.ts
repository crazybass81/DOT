// Toast hook - Basic implementation for build compatibility

export const useToast = () => {
  const toast = (options: any) => {
    console.log('Toast:', options);
  };

  return { toast };
};