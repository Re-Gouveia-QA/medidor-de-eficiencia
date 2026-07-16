export interface PaginationProps {
  page?: number;
  totalPages?: number;
  onChange?: (page: number) => void;
}
export declare function Pagination(props: PaginationProps): JSX.Element;
