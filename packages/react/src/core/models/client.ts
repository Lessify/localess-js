import type React from "react";
import {LocalessClientOptions} from "@localess/client";

export type {LocalessClient} from '@localess/client'
export type LocalessOptions = LocalessClientOptions & {
  /**
   * Components mapping for Localess Component integration
   */
  components?: Record<string, React.ElementType>;
  /**
   * Component used if expected key didn't return anything
   */
  fallbackComponent?: React.ElementType;

  /**
   * Load Sync Script, for Visual Editor integration
   */
  enableSync?: boolean
};
