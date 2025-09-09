// Toast hook - Basic implementation for build compatibility

export const toast = (options: any) => {
  console.log('Toast:', options);
};

export const useToast = () => {
  return { toast };
};