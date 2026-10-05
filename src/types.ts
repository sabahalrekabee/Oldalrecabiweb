export interface Book {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  author: string;
  year?: string;
  pages: number;
  description: string;
  backCoverBlurb: string;
  frontCoverUrl: string;
  backCoverUrl: string;
  pdfUrl?: string; // Real PDF URL or data:application/pdf
  pdfFileName?: string;
  pdfFileSize?: number;
  hasUploadedPdf?: boolean;
  fullContent?: {
    chapters: { title: string; pages: string[] }[];
  };
  featured?: boolean;
  createdAt: string;
}

export type Category = 
  | 'الكل'
  | 'عقائد وكلام'
  | 'فقه وأصول'
  | 'سيرة وتاريخ'
  | 'أخلاق وتزكية'
  | 'بحوث معاصرة'
  | 'خطب ومحاضرات';
