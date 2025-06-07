import { useState } from "react";
import { Button, Modal, Tooltip, ActionIcon } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

function Controls({ sendData, setReset }) {
  const [infoOpened, setInfoOpened] = useState(false);

  return (
    <>
      <div className="flex gap-2 items-center">
        <Button onClick={() => setReset(true)} color="dark">
          Reset
        </Button>

        <Tooltip label="About this project" withArrow>
          <ActionIcon
            color="blue"
            variant="light"
            onClick={() => setInfoOpened(true)}
            size="lg"
            style={{ cursor: "pointer" }}
          >
            <IconInfoCircle size={20} />
          </ActionIcon>
        </Tooltip>

        <Button onClick={sendData} color="dark">
          Calculate
        </Button>
      </div>

      <Modal
        opened={infoOpened}
        onClose={() => setInfoOpened(false)}
        title="About This Project"
        size="md"
        centered
      >
        <p>
          This project connects AI with your drawing input to analyze and
          generate meaningful insights in real-time.
        </p>
        <p>
          You can reset the canvas anytime using the Reset button and trigger AI
          calculations with Calculate.
        </p>
      </Modal>
    </>
  );
}

export default Controls;
