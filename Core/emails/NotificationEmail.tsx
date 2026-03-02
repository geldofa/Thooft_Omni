import {
    Html,
    Head,
    Preview,
    Body,
    Container,
    Section,
    Text,
    Button,
    Img,
    Tailwind,
} from "@react-email/components";

interface NotificationEmailProps {
    themePrimaryColor?: string;
    themeBgColor?: string;
    themeTextColor?: string;
    title?: string;
    message?: string;
    actionUrl?: string;
    actionText?: string;
}

const NotificationEmail = ({
    themePrimaryColor = "#6366f1",
    themeBgColor = "#f4f4f5",
    themeTextColor = "#18181b",
    title = "Je hebt een nieuwe melding",
    message = "Er is een update beschikbaar in het systeem. Klik op de knop hieronder om de details te bekijken.",
    actionUrl = "https://example.com",
    actionText = "Bekijk melding",
}: NotificationEmailProps) => {
    return (
        <Html lang="nl">
            <Head />
            <Preview>{title}</Preview>
            <Tailwind>
                <Body style={{ backgroundColor: themeBgColor }} className="font-sans">
                    <Container className="mx-auto my-10 max-w-[560px] rounded-2xl bg-white px-10 py-8 shadow-md">
                        {/* Header */}
                        <Section className="mb-6 border-b border-zinc-100 pb-6">
                            <Img
                                src="https://via.placeholder.com/120x32/6366f1/ffffff?text=Omni"
                                width={120}
                                height={32}
                                alt="Omni logo"
                                className="mb-4"
                            />
                            <Text
                                style={{ color: themeTextColor }}
                                className="m-0 text-2xl font-bold leading-tight"
                            >
                                {title}
                            </Text>
                        </Section>

                        {/* Body */}
                        <Section className="mb-8">
                            <Text
                                style={{ color: themeTextColor }}
                                className="m-0 text-base leading-relaxed opacity-80"
                            >
                                {message}
                            </Text>
                        </Section>

                        {/* CTA */}
                        <Section className="mb-8 text-center">
                            <Button
                                href={actionUrl}
                                style={{
                                    backgroundColor: themePrimaryColor,
                                    color: "#ffffff",
                                    borderRadius: "8px",
                                    padding: "12px 28px",
                                    fontSize: "15px",
                                    fontWeight: "600",
                                    textDecoration: "none",
                                    display: "inline-block",
                                }}
                            >
                                {actionText}
                            </Button>
                        </Section>

                        {/* Footer */}
                        <Section className="border-t border-zinc-100 pt-4">
                            <Text className="m-0 text-center text-xs text-zinc-400">
                                © {new Date().getFullYear()} Omni · Thooft. Alle rechten
                                voorbehouden.
                            </Text>
                        </Section>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default NotificationEmail;
