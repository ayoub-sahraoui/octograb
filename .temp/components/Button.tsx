import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ButtonProps {
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'icon';
  className?: string;
  icon?: LucideIcon;
  disabled?: boolean;
  title?: string;
  as?: 'button' | 'span';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  variant = "primary", 
  size = "md", 
  className = "", 
  icon: Icon, 
  disabled = false, 
  title = "",
  as: Component = "button"
}) => {
  const baseStyle = "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-200",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 focus:ring-slate-200",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 focus:ring-red-200",
    outline: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-200",
  };
  const sizes = { sm: "text-xs px-2 py-1", md: "text-sm px-3 py-2", icon: "p-2" };
  
  const props = {
    ...(Component === 'button' ? { onClick, disabled } : {}),
    title,
    className: `${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`
  };
  
  return React.createElement(
    Component,
    props,
    <>
      {Icon && <Icon className={`w-4 h-4 ${children ? "mr-2" : ""}`} />}
      {children}
    </>
  );
};
