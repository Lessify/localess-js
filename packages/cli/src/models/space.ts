import {Locale} from "./locale";

export interface Space {
  /**
   * Unique identifier for the object.
   */
  id: string;
  /**
   * Name of the Content
   */
  name: string;
  locales: Locale[];
  localeFallback: Locale;
  /**
   * Date and Time at which the Content was created.
   */
  createdAt: string;
  /**
   * Date and Time at which the Content was updated.
   */
  updatedAt: string;
}
