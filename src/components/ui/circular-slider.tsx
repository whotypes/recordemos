'use client'

import { useVideoOptionsStore } from '@/lib/video-options-store'
import CircularSlider, {
} from '@fseehawer/react-circular-slider'

const CircularSliderComp: React.FC = () => {
  const { gradientAngle, setGradientAngle } = useVideoOptionsStore()

  return (
    <CircularSlider
      label=" "
      width={100}
      min={0}
      initialValue={gradientAngle}
      max={360}
      dataIndex={gradientAngle}
      appendToValue="°"
      labelColor="#898aeb"
      labelBottom={true}
      knobColor="#898aeb"
      knobSize={20}
      progressColorFrom="#8e8ece"
      progressColorTo="rgb(202, 194, 255)"
      progressSize={6}
      trackColor="rgb(99 102 241 / 0.1)"
      trackSize={9}
      valueFontSize="1rem"
      onChange={(value: string | number) => {
        if (typeof value === 'string') {
          value = parseFloat(value)
        }
        setGradientAngle(value as number)
      }}
    >
      °
    </CircularSlider>
  )
}

export default CircularSliderComp
