import type { ReactNode } from "react";
import styled from "styled-components";

type FullScreenBackgroundProps = {
  background: string;
  children?: ReactNode;
  className?: string;
};

function FullScreenBackground({
  background,
  children,
  className,
}: FullScreenBackgroundProps) {
  return (
    <Screen className={className}>
      <BackgroundImage src={background} alt="" />
      <ContentLayer>{children}</ContentLayer>
    </Screen>
  );
}

export default FullScreenBackground;

const Screen = styled.div`
  position: fixed;
  inset: 0;
  overflow: hidden;
  background-color: #ffcde2;
`;

const BackgroundImage = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const ContentLayer = styled.div`
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
`;