interface CmykIconProps {
    className?: string;
    colored?: boolean;
}

export function CmykIcon({ className, colored = true }: CmykIconProps) {
    return (
        <svg
            viewBox="-2 -2 56 44"
            fill="none"
            className={className}
            width="100%"
            height="100%"
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Cyan drop */}
            <path
                d="M11 2 C11 2 1 16 1 24 C1 31.2 5.5 37 11 37 C16.5 37 21 31.2 21 24 C21 16 11 2 11 2Z"
                fill={colored ? "#67C6F0" : "white"}
                stroke={colored ? "#2D2D2D" : "currentColor"}
                strokeWidth="3"
                strokeLinejoin="round"
            />
            {/* Magenta drop */}
            <path
                d="M21 2 C21 2 11 16 11 24 C11 31.2 15.5 37 21 37 C26.5 37 31 31.2 31 24 C31 16 21 2 21 2Z"
                fill={colored ? "#E88DB6" : "white"}
                stroke={colored ? "#2D2D2D" : "currentColor"}
                strokeWidth="3"
                strokeLinejoin="round"
            />
            {/* Yellow drop */}
            <path
                d="M31 2 C31 2 21 16 21 24 C21 31.2 25.5 37 31 37 C36.5 37 41 31.2 41 24 C41 16 31 2 31 2Z"
                fill={colored ? "#F5C451" : "white"}
                stroke={colored ? "#2D2D2D" : "currentColor"}
                strokeWidth="3"
                strokeLinejoin="round"
            />
            {/* Key/Black drop */}
            <path
                d="M41 2 C41 2 31 16 31 24 C31 31.2 35.5 37 41 37 C46.5 37 51 31.2 51 24 C51 16 41 2 41 2Z"
                fill={colored ? "#8C8C96" : "white"}
                stroke={colored ? "#2D2D2D" : "currentColor"}
                strokeWidth="3"
                strokeLinejoin="round"
            />
        </svg>
    );
}
