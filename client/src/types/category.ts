export interface CategoryDto {
  id: string;
  name: string;
  description?: string;
  parentCategoryId?: string;
  questionCount: number;
  subCategories: CategoryDto[];
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  parentCategoryId?: string;
}

export interface UpdateCategoryRequest {
  id: string;
  name: string;
  description?: string;
  parentCategoryId?: string;
}
